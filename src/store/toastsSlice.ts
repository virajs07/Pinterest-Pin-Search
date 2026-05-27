import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuid } from 'uuid';

export type ToastKind = 'error' | 'info' | 'success';

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

export type ToastsState = { items: Toast[] };

const initialState: ToastsState = { items: [] };

const toastsSlice = createSlice({
  name: 'toasts',
  initialState,
  reducers: {
    push: {
      reducer(state, action: PayloadAction<Toast>) {
        state.items.push(action.payload);
      },
      prepare(input: { kind: ToastKind; message: string }) {
        return { payload: { id: uuid(), ...input } };
      },
    },
    dismiss(state, action: PayloadAction<string>) {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
  },
});

export const { push: pushToast, dismiss: dismissToast } = toastsSlice.actions;
export default toastsSlice.reducer;
