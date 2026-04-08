import { EventEmitter } from "node:events"
import type { MemoryEvent } from "../types.js"

export type MemoryEventName = "ingested" | "discarded" | "scored"

export interface EventBus {
	on: (event: MemoryEventName, listener: (e: MemoryEvent) => void) => void
	off: (event: MemoryEventName, listener: (e: MemoryEvent) => void) => void
	emit: (event: MemoryEventName, e: MemoryEvent) => void
}

export const createEventBus = (): EventBus => {
	const emitter = new EventEmitter()
	return {
		on: (event, listener) => {
			emitter.on(event, listener)
		},
		off: (event, listener) => {
			emitter.off(event, listener)
		},
		emit: (event, e) => {
			emitter.emit(event, e)
		},
	}
}
