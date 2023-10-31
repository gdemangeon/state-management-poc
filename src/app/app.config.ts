import { ApplicationConfig } from '@angular/core';
import {defaultStoreProvider} from "@state-adapt/angular";

export const appConfig: ApplicationConfig = {
  providers: [defaultStoreProvider]
};
