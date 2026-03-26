import { defineFeature } from "../../../../lib";
import { 
  saveProfilePort, 
  getProfilePort 
} from "./identity.ports";

/**
 * Identity Feature: Профили облачного провайдера
 */
export const IdentityFeature = defineFeature({
  saveProfile: saveProfilePort,
  getProfile: getProfilePort,
});
