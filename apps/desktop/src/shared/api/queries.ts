import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DrawingQuery } from "@drawscope/contracts";
import {
  getDrawings,
  getSnapshot,
  getSourceUpdateSnapshot,
  importSavedLotteryNetPages,
} from "./client";

export const snapshotQuery = queryOptions({
  queryKey: ["app", "snapshot"],
  queryFn: getSnapshot,
});

export function useSnapshot() {
  return useQuery(snapshotQuery);
}

export function useDrawings(query: DrawingQuery, enabled = true) {
  return useQuery({
    queryKey: ["drawings", query],
    queryFn: () => getDrawings(query),
    enabled,
  });
}

export const sourceUpdateQuery = queryOptions({
  queryKey: ["sources", "updates"],
  queryFn: getSourceUpdateSnapshot,
});

export function useSourceUpdates() {
  return useQuery(sourceUpdateQuery);
}

export function useSavedPageImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importSavedLotteryNetPages,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sourceUpdateQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: snapshotQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ["drawings"] }),
      ]);
    },
  });
}
