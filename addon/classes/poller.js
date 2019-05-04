import { later, cancel } from '@ember/runloop';

export default class Poller extends Object {

	constructor(interval = 1000) {
		super();
		this.poller = null;
		this.interval = interval;
	}

	clear() {
		cancel(this.poller);
	}

	start(ctx, func, ...args) {
		this.poller = this._schedule(ctx, func, ...args);
	}

	_schedule(ctx, func, ...args) {
		return later(this, () => {
			this.poller = this._schedule(ctx, func, ...args);
			func.apply(ctx, args);
		}, this.interval);
	}

}
