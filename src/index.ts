import type { CancelTokenSource } from 'axios';
import { noop } from './constants';

export interface CreateEffectCleanerOpts {
  /**
   * abort fetch network requests
   */
  abortController?: AbortController;

  /**
   * abort axios based network requests
   */
  cancelTokenSource?: CancelTokenSource;

  /**
   * object containing timeout ids
   */
  timeoutIds?: {
    [p: string]: number;
  };

  /**
   * object containing intervalIds
   */
  intervalIds?: {
    [p: string]: number;
  };

  /**
   * called when running effects cleanup
   * @returns
   */
  callback?: () => void;
}

/**
 * creates a use effect cleaner that aborts asynchronous requests on destroy
 * and also prevents stalled state updates
 */
export const createEffectCleaner = <T>(
  stateModifiers: T,
  opts?: CreateEffectCleanerOpts
) => {
  let _stalled = false;
  const {
    abortController,
    cancelTokenSource,
    intervalIds,
    timeoutIds,
    callback = noop,
  } = opts || {};

  const handler = {
    apply(stateModifier, thisArg, argArray) {
      if (_stalled) {
        return;
      }
      return stateModifier.call(thisArg, ...argArray);
    },
  };

  const proxies = Object.keys(stateModifiers || {}).reduce((result, key) => {
    const stateModifier = stateModifiers[key];
    result[key] = new Proxy(stateModifier, handler);
    return result;
  }, {} as T & { clean: () => void });

  // cleans effects
  proxies.clean = () => {
    _stalled = true;

    // abort asynchronous requests
    try {
      if (abortController && abortController.abort) {
        abortController.abort();
      }
    } catch (ex) {
      // do nothing
    }

    try {
      if (cancelTokenSource && cancelTokenSource.cancel) {
        cancelTokenSource.cancel();
      }
    } catch (ex) {
      // do nothing
    }

    // abort set intervals
    if (intervalIds) {
      Object.keys(intervalIds).forEach((key) => {
        clearInterval(intervalIds[key]);
      });
    }

    // clear timeouts
    if (timeoutIds) {
      Object.keys(timeoutIds).forEach((key) => {
        clearTimeout(timeoutIds[key]);
      });
    }

    callback();
  };

  return proxies;
};
