import { createStore } from "./storage";

export const browserStore = createStore(window.localStorage);
