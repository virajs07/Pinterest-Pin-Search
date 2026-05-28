import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { NewImageVariant, NewPin, Pin } from '@/types/Pin';
import type { PinRepository } from '@/data/PinRepository';
import { removePin, upsertPin, upsertPins } from './pinsSlice';
import { pushToast } from './toastsSlice';

export type FeedStatus = 'idle' | 'loading' | 'end' | 'no_results' | 'api_error';

export type FeedState = {
  order: string[];
  status: FeedStatus;
  nextCursor?: string;
  query: string;
  descIndex: Record<string, string[]>;
  errorMessage?: string;
};

const initialState: FeedState = {
  order: [],
  status: 'idle',
  query: '',
  descIndex: {},
  errorMessage: undefined,
};

type ThunkExtra = { repo: PinRepository };

export const hydrate = createAsyncThunk<
  { pins: Pin[]; nextCursor?: string },
  void,
  { extra: ThunkExtra }
>('feed/hydrate', async (_arg, { dispatch, extra, signal }) => {
  const result = await extra.repo.list({ limit: 60 }, signal);
  dispatch(upsertPins(result.pins));
  return result;
});

function variantMeta(v: NewImageVariant): { url: string; width: number; height: number; type: NewImageVariant['type'] } {
  return { url: '', width: v.width, height: v.height, type: v.type };
}

function buildOptimisticPin(tempId: string, newPin: NewPin, createdAt: number): Pin {
  return {
    id: tempId,
    description: newPin.description,
    descriptionLower: newPin.description.toLowerCase(),
    width: newPin.width,
    height: newPin.height,
    dominantColor: newPin.dominantColor,
    createdAt,
    responsive: {
      '170': variantMeta(newPin.responsive['170']),
      '236': variantMeta(newPin.responsive['236']),
      '474': variantMeta(newPin.responsive['474']),
      '736': variantMeta(newPin.responsive['736']),
      orig: variantMeta(newPin.responsive.orig),
    },
  };
}

export const PAGE_SIZE = 20;
export const FETCH_TIMEOUT_MS = 8000;

type StateLike = { feed: FeedState };

export const fetchPage = createAsyncThunk<
  { pins: Pin[]; nextCursor?: string; appendedTo: string; isFirstPage: boolean },
  void,
  { extra: ThunkExtra; rejectValue: string }
>(
  'feed/fetchPage',
  async (_arg, { dispatch, extra, getState, signal, rejectWithValue }) => {
    const before = (getState() as StateLike).feed;

    // Combine the thunk's abort signal with a timeout, so the request fails
    // fast if the repo (today IndexedDB, tomorrow HTTP) wedges. We track which
    // controller fired so the rejected reducer can pick a clear message.
    const timeoutCtrl = new AbortController();
    const timeoutId = setTimeout(
      () => timeoutCtrl.abort(new DOMException('Timed out', 'TimeoutError')),
      FETCH_TIMEOUT_MS,
    );
    const forwardAbort = () => timeoutCtrl.abort();
    signal.addEventListener('abort', forwardAbort);

    try {
      const result = await extra.repo.list(
        {
          cursor: before.nextCursor,
          limit: PAGE_SIZE,
          query: before.query || undefined,
        },
        timeoutCtrl.signal,
      );
      // Drop the entity write if the user changed query while we were in flight.
      // The fulfilled reducer below also no-ops in that case; this prevents
      // unreferenced pins from accumulating in state.pins.entities.
      const after = (getState() as StateLike).feed;
      if ((after.query || undefined) === (before.query || undefined)) {
        dispatch(upsertPins(result.pins));
      }
      return {
        ...result,
        appendedTo: before.query,
        isFirstPage: before.nextCursor === undefined,
      };
    } catch (err) {
      if (timeoutCtrl.signal.aborted && !signal.aborted) {
        return rejectWithValue('Search timed out. Please try again.');
      }
      const message = err instanceof Error ? err.message : 'Failed to load results';
      return rejectWithValue(message);
    } finally {
      clearTimeout(timeoutId);
      signal.removeEventListener('abort', forwardAbort);
    }
  },
  {
    condition: (_arg, { getState }) => {
      const s = getState() as StateLike;
      return s.feed.status !== 'loading' && s.feed.status !== 'end';
    },
  },
);

export const createPin = createAsyncThunk<Pin, NewPin, { extra: ThunkExtra }>(
  'feed/createPin',
  async (newPin, { dispatch, extra, requestId, signal, rejectWithValue }) => {
    const tempId = `tmp_${requestId}`;
    const optimistic = buildOptimisticPin(tempId, newPin, Date.now());
    dispatch(upsertPin(optimistic));
    dispatch(optimisticAdded({ tempId, descriptionLower: optimistic.descriptionLower }));
    try {
      const confirmed = await extra.repo.create(newPin, signal);
      dispatch(upsertPin(confirmed));
      dispatch(removePin(tempId));
      dispatch(optimisticConfirmed({ tempId, confirmed }));
      return confirmed;
    } catch (err) {
      dispatch(removePin(tempId));
      dispatch(
        optimisticRolledBack({ tempId, descriptionLower: optimistic.descriptionLower }),
      );
      // Optimistic pin had no materialized blob URLs, so this is a no-op today.
      // It's wired here so the contract holds the moment a real delete-pin
      // path is added (and any future delete code is required to do the same).
      extra.repo.revoke?.(tempId);
      const message = err instanceof Error ? err.message : 'Could not save pin';
      dispatch(pushToast({ kind: 'error', message }));
      return rejectWithValue(message);
    }
  },
);

const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      // Keep state.order populated so the user sees stale pins while the new
      // query is in flight (prevents FOUC). The first page of the new query
      // replaces the order in fetchPage.fulfilled.
      state.query = action.payload;
      state.nextCursor = undefined;
      state.status = 'idle';
      state.errorMessage = undefined;
    },
    optimisticAdded(
      state,
      action: PayloadAction<{ tempId: string; descriptionLower: string }>,
    ) {
      const { tempId, descriptionLower } = action.payload;
      state.order.unshift(tempId);
      const list = state.descIndex[descriptionLower];
      if (list) list.unshift(tempId);
      else state.descIndex[descriptionLower] = [tempId];
    },
    optimisticConfirmed(
      state,
      action: PayloadAction<{ tempId: string; confirmed: Pin }>,
    ) {
      const { tempId, confirmed } = action.payload;
      const i = state.order.indexOf(tempId);
      if (i !== -1) state.order[i] = confirmed.id;
      const list = state.descIndex[confirmed.descriptionLower];
      if (list) {
        const j = list.indexOf(tempId);
        if (j !== -1) list[j] = confirmed.id;
      }
    },
    optimisticRolledBack(
      state,
      action: PayloadAction<{ tempId: string; descriptionLower: string }>,
    ) {
      const { tempId, descriptionLower } = action.payload;
      state.order = state.order.filter((id) => id !== tempId);
      const list = state.descIndex[descriptionLower];
      if (list) {
        const filtered = list.filter((id) => id !== tempId);
        if (filtered.length === 0) delete state.descIndex[descriptionLower];
        else state.descIndex[descriptionLower] = filtered;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(hydrate.pending, (state) => {
      state.status = 'loading';
    });
    builder.addCase(hydrate.fulfilled, (state, action) => {
      const { pins, nextCursor } = action.payload;
      state.order = pins.map((p) => p.id);
      state.nextCursor = nextCursor;
      state.status = nextCursor ? 'idle' : 'end';
      state.descIndex = {};
      for (const p of pins) {
        const k = p.descriptionLower;
        const list = state.descIndex[k];
        if (list) list.push(p.id);
        else state.descIndex[k] = [p.id];
      }
    });
    builder.addCase(hydrate.rejected, (state, action) => {
      state.status = 'api_error';
      state.errorMessage = action.error.message ?? 'Failed to load feed';
    });
    builder.addCase(fetchPage.pending, (state) => {
      state.status = 'loading';
    });
    builder.addCase(fetchPage.fulfilled, (state, action) => {
      const { pins, nextCursor, appendedTo, isFirstPage } = action.payload;
      // If the query changed mid-flight, drop the response.
      if ((state.query || undefined) !== (appendedTo || undefined)) return;

      state.errorMessage = undefined;

      if (isFirstPage) {
        // First page of this query — replace the order in one shot so the
        // user goes from stale pins straight to fresh pins (no blank state).
        state.order = pins.map((p) => p.id);
        state.descIndex = {};
        for (const p of pins) {
          const list = state.descIndex[p.descriptionLower];
          if (list) list.push(p.id);
          else state.descIndex[p.descriptionLower] = [p.id];
        }
      } else {
        for (const p of pins) {
          if (!state.order.includes(p.id)) state.order.push(p.id);
          const list = state.descIndex[p.descriptionLower];
          if (list) {
            if (!list.includes(p.id)) list.push(p.id);
          } else {
            state.descIndex[p.descriptionLower] = [p.id];
          }
        }
      }

      if (state.order.length === 0 && state.query) {
        state.status = 'no_results';
        return;
      }

      state.nextCursor = nextCursor;
      state.status = nextCursor ? 'idle' : 'end';
    });
    builder.addCase(fetchPage.rejected, (state, action) => {
      // Ignore aborts caused by query changes — the new request will replace state.
      if (action.meta.aborted) return;
      state.status = 'api_error';
      state.errorMessage = action.payload ?? 'Failed to load results';
    });
  },
});

export const { setQuery, optimisticAdded, optimisticConfirmed, optimisticRolledBack } =
  feedSlice.actions;
export default feedSlice.reducer;
