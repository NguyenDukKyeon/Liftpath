import { makeSyncEnvelope, normalizeState } from "./storage.js";
import type { AppState, SyncEnvelope } from "../types.js";

const headers = (token: string) => ({
  "Content-Type": "application/json",
  ...(token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
});

export const pushRemoteState = async (state: AppState) => {
  const { endpoint, token } = state.sync;
  if (!endpoint.trim()) throw new Error("Chưa cấu hình endpoint đồng bộ.");
  const response = await fetch(endpoint.trim(), {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(makeSyncEnvelope(state)),
  });
  if (!response.ok) throw new Error(`Đẩy dữ liệu thất bại (${response.status}).`);
  return new Date().toISOString();
};

export const pullRemoteState = async (state: AppState): Promise<AppState> => {
  const { endpoint, token } = state.sync;
  if (!endpoint.trim()) throw new Error("Chưa cấu hình endpoint đồng bộ.");
  const response = await fetch(endpoint.trim(), { method: "GET", headers: headers(token) });
  if (response.status === 404) throw new Error("Endpoint chưa có bản sao lưu. Hãy đẩy dữ liệu trước.");
  if (!response.ok) throw new Error(`Tải dữ liệu thất bại (${response.status}).`);
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null || (payload as Partial<SyncEnvelope>).app !== "liftpath") {
    throw new Error("Dữ liệu từ endpoint không đúng định dạng LiftPath.");
  }
  const remote = normalizeState((payload as SyncEnvelope).state);
  return {
    ...remote,
    sync: {
      ...state.sync,
      lastSyncedAt: new Date().toISOString(),
      lastError: null,
    },
  };
};

export const chooseNewestState = (local: AppState, remote: AppState) =>
  new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime() ? remote : local;
