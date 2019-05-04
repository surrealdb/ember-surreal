import test from '../utils/test';

export default class Storage {

	constructor() {
		this.ok = test();
		this.data = new Object();
	}

	set(id, val) {
		switch (this.ok) {
		case true:
			return window.localStorage.setItem(id, val);
		case false:
			return this.data[id] = val || undefined;
		}
	}

	get(id) {
		switch (this.ok) {
		case true:
			return window.localStorage.getItem(id);
		case false:
			return this.data[id] || undefined;
		}
	}

	del(id) {
		switch (this.ok) {
		case true:
			return window.localStorage.removeItem(id);
		case false:
			return delete this.data[id];
		}
	}

	clear() {
		switch (this.ok) {
		case true:
			return window.localStorage.clear();
		case false:
			return this.data = new Object();
		}
	}

}
