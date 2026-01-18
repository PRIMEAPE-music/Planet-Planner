import type { Vector2, InputState } from '@/types';

export type InputEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel'
  | 'wheel';

export interface InputEventCallback {
  (state: InputState, event: PointerEvent | WheelEvent): void;
}

/**
 * Input handler for canvas interactions
 * Normalizes mouse and touch input
 */
export class InputHandler {
  private element: HTMLElement;
  private state: InputState;
  private listeners: Map<InputEventType, Set<InputEventCallback>>;
  private worldTransform: (screen: Vector2) => Vector2;

  constructor(
    element: HTMLElement,
    worldTransform: (screen: Vector2) => Vector2
  ) {
    this.element = element;
    this.worldTransform = worldTransform;
    this.listeners = new Map();

    this.state = {
      screenPosition: { x: 0, y: 0 },
      worldPosition: { x: 0, y: 0 },
      isPrimaryDown: false,
      isSecondaryDown: false,
      isMiddleDown: false,
      modifiers: {
        shift: false,
        ctrl: false,
        alt: false,
        meta: false,
      },
      pressure: 0,
    };

    this.setupListeners();
  }

  /**
   * Subscribe to input events
   */
  on(type: InputEventType, callback: InputEventCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /**
   * Get current input state
   */
  getState(): InputState {
    return { ...this.state };
  }

  /**
   * Update world transform function (when camera changes)
   */
  setWorldTransform(transform: (screen: Vector2) => Vector2): void {
    this.worldTransform = transform;
  }

  /**
   * Setup DOM event listeners
   */
  private setupListeners(): void {
    this.element.addEventListener('pointerdown', this.handlePointerDown);
    this.element.addEventListener('pointermove', this.handlePointerMove);
    this.element.addEventListener('pointerup', this.handlePointerUp);
    this.element.addEventListener('pointercancel', this.handlePointerCancel);
    this.element.addEventListener('pointerleave', this.handlePointerLeave);
    this.element.addEventListener('wheel', this.handleWheel, { passive: false });
    this.element.addEventListener('contextmenu', this.handleContextMenu);

    // Prevent default touch behaviors
    this.element.style.touchAction = 'none';
  }

  /**
   * Update state from pointer event
   */
  private updateStateFromEvent(event: PointerEvent): void {
    const rect = this.element.getBoundingClientRect();
    this.state.screenPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    this.state.worldPosition = this.worldTransform(this.state.screenPosition);
    this.state.modifiers = {
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      meta: event.metaKey,
    };
    this.state.pressure = event.pressure || (this.state.isPrimaryDown ? 1 : 0);
  }

  /**
   * Emit event to listeners
   */
  private emit(type: InputEventType, event: PointerEvent | WheelEvent): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback => callback({ ...this.state }, event));
    }
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.updateStateFromEvent(event);

    switch (event.button) {
      case 0:
        this.state.isPrimaryDown = true;
        break;
      case 1:
        this.state.isMiddleDown = true;
        break;
      case 2:
        this.state.isSecondaryDown = true;
        break;
    }

    this.element.setPointerCapture(event.pointerId);
    this.emit('pointerdown', event);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    this.updateStateFromEvent(event);
    this.emit('pointermove', event);
  };

  private handlePointerUp = (event: PointerEvent): void => {
    this.updateStateFromEvent(event);

    switch (event.button) {
      case 0:
        this.state.isPrimaryDown = false;
        break;
      case 1:
        this.state.isMiddleDown = false;
        break;
      case 2:
        this.state.isSecondaryDown = false;
        break;
    }

    this.element.releasePointerCapture(event.pointerId);
    this.emit('pointerup', event);
  };

  private handlePointerCancel = (event: PointerEvent): void => {
    this.state.isPrimaryDown = false;
    this.state.isSecondaryDown = false;
    this.state.isMiddleDown = false;
    this.emit('pointercancel', event);
  };

  private handlePointerLeave = (event: PointerEvent): void => {
    // Don't reset button state on leave if we have capture
    this.updateStateFromEvent(event);
  };

  private handleWheel = (event: WheelEvent): void => {
    event.preventDefault();

    const rect = this.element.getBoundingClientRect();
    this.state.screenPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    this.state.worldPosition = this.worldTransform(this.state.screenPosition);
    this.state.modifiers = {
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      meta: event.metaKey,
    };

    this.emit('wheel', event);
  };

  private handleContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    this.element.removeEventListener('pointerdown', this.handlePointerDown);
    this.element.removeEventListener('pointermove', this.handlePointerMove);
    this.element.removeEventListener('pointerup', this.handlePointerUp);
    this.element.removeEventListener('pointercancel', this.handlePointerCancel);
    this.element.removeEventListener('pointerleave', this.handlePointerLeave);
    this.element.removeEventListener('wheel', this.handleWheel);
    this.element.removeEventListener('contextmenu', this.handleContextMenu);
  }
}
