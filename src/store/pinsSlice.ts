import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Pin } from '@/types/Pin';

export const pinsAdapter = createEntityAdapter<Pin>();

const pinsSlice = createSlice({
  name: 'pins',
  initialState: pinsAdapter.getInitialState(),
  reducers: {
    upsertOne(state, action: PayloadAction<Pin>) {
      pinsAdapter.upsertOne(state, action.payload);
    },
    upsertMany(state, action: PayloadAction<Pin[]>) {
      pinsAdapter.upsertMany(state, action.payload);
    },
    removeOne(state, action: PayloadAction<string>) {
      pinsAdapter.removeOne(state, action.payload);
    },
  },
});

export const { upsertOne: upsertPin, upsertMany: upsertPins, removeOne: removePin } =
  pinsSlice.actions;
export default pinsSlice.reducer;
