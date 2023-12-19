import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type PointStoreState = {
    posPoints: { x: number; y: number }[];
    negPoints: { x: number; y: number }[];
};

export type PointStoreActions = {
    addPosPoint: (x: number, y: number) => void;
    addNegPoint: (x: number, y: number) => void;
    deletePosPoint: (x: number, y: number) => void;
    deleteNegPoint: (x: number, y: number) => void;
    deleteAllPoints: () => void;
};

export const usePointStore = create<PointStoreState & PointStoreActions>()(
    (set, get) => ({
        posPoints: [],
        negPoints: [],
        addPosPoint: (x, y) => set({posPoints: [...get().posPoints, {x, y}]}),
        addNegPoint: (x, y) => set({negPoints: [...get().negPoints, {x, y}]}),
        deletePosPoint: (x, y) => set({posPoints: get().posPoints.filter(p => p.x !== x && p.y !== y)}),
        deleteNegPoint: (x, y) => set({negPoints: get().negPoints.filter(p => p.x !== x && p.y !== y)}),
        deleteAllPoints: () => set({posPoints: [], negPoints: []})
    })
);