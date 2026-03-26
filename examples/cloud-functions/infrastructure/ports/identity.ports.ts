import { createPort } from "../../../../lib";

export type CloudProfileDto = {
  name: string;
  folderId: string;
  oauthToken?: string;
};

/**
 * Ports: Contracts for managing cloud providers (Control Plane)
 */

// Привязать провайдера (например, Yandex Cloud) к профилю SotaJS
export const saveProfilePort = createPort<(profile: CloudProfileDto) => void>();

// Получить активный конфиг провайдера
export const getProfilePort = createPort<(name: string) => CloudProfileDto | null>();
