import { defineCore } from "../../lib";
import { PaywallFeature, InMemoryPaywallAdapter } from "./infrastructure";

export const core = defineCore({
  paywall: PaywallFeature,
});

core.bindFeatures(({ paywall }) => {
  paywall.bind(InMemoryPaywallAdapter);
});
