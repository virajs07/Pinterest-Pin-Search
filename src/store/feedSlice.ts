import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { NewImageVariant, NewPin, Pin } from '@/types/Pin';
import type { PinRepository } from '@/data/PinRepository';
import { removePin, upsertPin, upsertPins } from './pinsSlice';
import { pushToast } from './toastsSlice';

export type FeedStatus = 'idle' | 'loading' | 'error' | 'end';

export type FeedState = {
  order: string[];
  status: FeedStatus;
  nextCursor?: string;
  query: string;
  descIndex: Record<string, string[]>;
};

const initialState: FeedState = {
  order: [],
  status: 'idle',
  query: '',
  descIndex: {},
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

type StateLike = { feed: FeedState };

export const fetchPage = createAsyncThunk<
  { pins: Pin[]; nextCursor?: string; appendedTo: string },
  void,
  { extra: ThunkExtra }
>(
  'feed/fetchPage',
  async (_arg, { dispatch, extra, getState, signal }) => {
    const before = (getState() as StateLike).feed;
    const result = await extra.repo.list(
      {
        cursor: before.nextCursor,
        limit: PAGE_SIZE,
        query: before.query || undefined,
      },
      signal,
    );
    // Drop the entity write if the user changed query while we were in flight.
    // The fulfilled reducer below also no-ops in that case; this prevents
    // unreferenced pins from accumulating in state.pins.entities.
    const after = (getState() as StateLike).feed;
    if ((after.query || undefined) === (before.query || undefined)) {
      dispatch(upsertPins(result.pins));
    }
    return { ...result, appendedTo: before.query };
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
      state.query = action.payload;
      state.order = [];
      state.nextCursor = undefined;
      state.status = 'idle';
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
    builder.addCase(hydrate.rejected, (state) => {
      state.status = 'error';
    });
    builder.addCase(fetchPage.pending, (state) => {
      state.status = 'loading';
    });
    builder.addCase(fetchPage.fulfilled, (state, action) => {
      const { pins, nextCursor, appendedTo } = action.payload;
      // If the query changed mid-flight, drop the response.
      if ((state.query || undefined) !== (appendedTo || undefined)) return;
      for (const p of pins) {
        if (!state.order.includes(p.id)) state.order.push(p.id);
        const list = state.descIndex[p.descriptionLower];
        if (list) {
          if (!list.includes(p.id)) list.push(p.id);
        } else {
          state.descIndex[p.descriptionLower] = [p.id];
        }
      }
      state.nextCursor = nextCursor;
      state.status = nextCursor ? 'idle' : 'end';
    });
    builder.addCase(fetchPage.rejected, (state) => {
      state.status = 'error';
    });
  },
});

export const { setQuery, optimisticAdded, optimisticConfirmed, optimisticRolledBack } =
  feedSlice.actions;
export default feedSlice.reducer;
