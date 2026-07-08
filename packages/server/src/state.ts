import { ReadyState, WebSocket } from '@elitjs/ws';

import type { SharedStateOptions, StateChangeHandler } from './types';

export class SharedState<T = any> {
  private _value: T;
  private listeners = new Set<WebSocket>();
  private changeHandlers = new Set<StateChangeHandler<T>>();
  private options: SharedStateOptions<T>;

  constructor(
    public readonly key: string,
    options: SharedStateOptions<T>,
  ) {
    this.options = options;
    this._value = options.initial;
  }

  get value(): T {
    return this._value;
  }

  set value(newValue: T) {
    if (this.options.validate && !this.options.validate(newValue)) {
      throw new Error(`Invalid state value for "${this.key}"`);
    }

    const oldValue = this._value;
    this._value = newValue;

    this.changeHandlers.forEach((handler) => {
      handler(newValue, oldValue);
    });

    this.broadcast();
  }

  update(updater: (current: T) => T): void {
    this.value = updater(this._value);
  }

  subscribe(ws: WebSocket): void {
    this.listeners.add(ws);
    this.sendTo(ws);
  }

  unsubscribe(ws: WebSocket): void {
    this.listeners.delete(ws);
  }

  onChange(handler: StateChangeHandler<T>): () => void {
    this.changeHandlers.add(handler);
    return () => this.changeHandlers.delete(handler);
  }

  private broadcast(): void {
    const message = JSON.stringify({ type: 'state:update', key: this.key, value: this._value, timestamp: Date.now() });
    this.listeners.forEach((ws) => ws.readyState === ReadyState.OPEN && ws.send(message));
  }

  private sendTo(ws: WebSocket): void {
    if (ws.readyState === ReadyState.OPEN) {
      ws.send(JSON.stringify({ type: 'state:init', key: this.key, value: this._value, timestamp: Date.now() }));
    }
  }

  get subscriberCount(): number {
    return this.listeners.size;
  }

  clear(): void {
    this.listeners.clear();
    this.changeHandlers.clear();
  }
}

export class StateManager {
  private states = new Map<string, SharedState<any>>();

  create<T>(key: string, options: SharedStateOptions<T>): SharedState<T> {
    if (this.states.has(key)) {
      return this.states.get(key) as SharedState<T>;
    }

    const state = new SharedState<T>(key, options);
    this.states.set(key, state);
    return state;
  }

  get<T>(key: string): SharedState<T> | undefined {
    return this.states.get(key) as SharedState<T>;
  }

  has(key: string): boolean {
    return this.states.has(key);
  }

  delete(key: string): boolean {
    const state = this.states.get(key);
    if (state) {
      state.clear();
      return this.states.delete(key);
    }

    return false;
  }

  subscribe(key: string, ws: WebSocket): void {
    this.states.get(key)?.subscribe(ws);
  }

  unsubscribe(key: string, ws: WebSocket): void {
    this.states.get(key)?.unsubscribe(ws);
  }

  unsubscribeAll(ws: WebSocket): void {
    this.states.forEach((state) => state.unsubscribe(ws));
  }

  handleStateChange(key: string, value: any): void {
    const state = this.states.get(key);
    if (state) {
      state.value = value;
    }
  }

  keys(): string[] {
    return Array.from(this.states.keys());
  }

  clear(): void {
    this.states.forEach((state) => state.clear());
    this.states.clear();
  }
}