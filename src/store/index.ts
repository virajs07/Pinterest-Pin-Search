import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { PinRepository } from '@/data/PinRepository';
import pins from './pinsSlice';
import feed from './feedSlice';
import toasts from './toastsSlice';
import suggestions from './suggestionsSlice';

export function makeStore(repo: PinRepository) {
  return configureStore({
    reducer: { pins, feed, toasts, suggestions },
    middleware: (getDefault) =>
      getDefault({ thunk: { extraArgument: { repo } } }),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
