import { get, set, computed } from '@ember/object';
import { next, cancel } from '@ember/runloop';
import { task, timeout } from 'ember-concurrency';
import ArrayProxy from '@ember/array/proxy';
import ObjectProxy from '@ember/object';
import { Promise } from 'rsvp';

export function waitForNext() {
	let temp;
	let promise = new Promise(r => {
		temp = next(r)
	});
	promise.__ec_cancel__ = () => {
		cancel(temp);
	};
	return promise;
}

const ArraySaver = ArrayProxy.extend({

	init() {
		this._super(...arguments);
		this._cache = ObjectProxy.create();
	},

	save() {
		let model = this.context || this;
		model.get('autosave').perform();
	},

	arrayContentDidChange(idx, del, add) {
		this._super(...arguments);
		if (idx == 0 && del == add) return;
		this.save();
	},

});

const FragsSaver = ArrayProxy.extend({

	init() {
		this._super(...arguments);
		this._cache = ObjectProxy.create();
	},

	save() {
		let model = this.context || this;
		model.get('autosave').perform();
	},

	arrayContentDidChange(idx, del, add) {
		this._super(...arguments);
		if (idx == 0 && del == add) return;
		this.save();
	},

	objectAtContent(idx) {
		let context = this.context || this;
		let content = this.get('content').objectAt(idx);
		return this.setupFragmentProperty(idx, content, context);
	},

	setupFragmentProperty(idx, content, context) {
		switch (this._cache[idx]) {
		case undefined:
			return this._cache[idx] = ModelSaver.create({ content, context });
		default:
			return this._cache[idx];
		}
	},

});

const ModelSaver = ObjectProxy.extend({

	init() {

		this._super(...arguments);

		this._cache = ObjectProxy.create();

		this.content.eachAttribute( (name, attr) => {

			if (attr.isFragment) {
				if ( attr.type.indexOf('-mf-fragment-array$') === 0) {
					return this.setupFragmentArrayProperty(name, `content.${name}`);
				}
				if ( attr.type.indexOf('-mf-fragment$') === 0) {
					return this.setupModelProperty(name, `content.${name}`);
				}
				if ( attr.type.indexOf('-mf-array$') === 0) {
					return this.setupArrayProperty(name, `content.${name}`);
				}
			} else {
				switch (attr.type) {
				case 'object':
					return this.setupModelProperty(name, `content.${name}`);
				case 'array':
					return this.setupArrayProperty(name, `content.${name}`);
				default:
					return this.setupFieldProperty(name, `content.${name}`);
				}
			}

		});

	},

	save() {
		let model = this.context || this;
		model.get('autosave').perform();
	},

	autosave: task(function * () {
		yield timeout(50);
		yield waitForNext();
		yield this.content.save();
	}).keepLatest(),

	cacheProperty(name, value) {
		return this._cache[name] = value;
	},

	destroyProperty(name) {
		return this._cache[name] ? this._cache[name].destroy() : null;
	},

	setupFieldProperty(name, prop) {
		this.set(name, computed(prop, {
			get(/*key*/) {
				return get(this, prop);
			},
			set(key, value) {
				set(this, prop, value);
				this.save();
				return value;
			}
		}));
	},

	setupArrayProperty(name, prop) {
		this.set(name, computed(prop, {
			get(/*key*/) {
				// this.destroyProperty(name);
				let content = get(this, prop);
				let context = this.context || this;
				return this._cache[name] || this.cacheProperty(
					name, ArraySaver.create({ content, context })
				);
			},
		}));
	},

	setupModelProperty(name, prop) {
		this.set(name, computed(prop, {
			get(/*key*/) {
				// this.destroyProperty(name);
				let content = get(this, prop);
				let context = this.context || this;
				return this._cache[name] || this.cacheProperty(
					name, ModelSaver.create({ content, context })
				);
			},
		}));
	},

	setupFragmentArrayProperty(name, prop) {
		this.set(name, computed(prop, {
			get(/*key*/) {
				// this.destroyProperty(name);
				let content = get(this, prop);
				let context = this.context || this;
				return this._cache[name] || this.cacheProperty(
					name, FragsSaver.create({ content, context })
				);
			},
		}));
	},

});

export default ModelSaver;
