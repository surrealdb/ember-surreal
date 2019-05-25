import Mixin from '@ember/object/mixin';
import { observer } from '@ember/object';
import { inject } from '@ember/service';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency';
import Patch from '../classes/patch';
import Diff from '../classes/diff';

const DIFF = function(old, now) {
	let v = new Diff(old, now);
	return v.output();
};

const PATCH = function(old, ops) {
	let v = new Patch(old, ops);
	return v.output();
}

export default Mixin.create({

	surreal: inject(),

	didLoad() {
		this._super(...arguments);
		this._cache = this.serialize();
	},

	findsave: observer('dirtyType', function() {

		this.get('autosave').perform();

	}).on('init'),

	autosave: task(function* () {

		yield timeout(100);

		if (this.dirtyType === 'updated') {
			yield this.save();
		}

	}).restartable(),

	deleter: task(function* (store, type, snapshot) {

		return yield this.surreal.delete(type.modelName, snapshot.id);

	}).restartable(),

	creater: task(function* (store, type, snapshot) {

		let data = this.serialize();

		return yield this.surreal.create(type.modelName, snapshot.id, data);

	}).restartable(),

	updater: task(function* (store, type, snapshot) {

		yield timeout(500);

		let shadow = this._cache;
		let client = this.serialize();
		let change = DIFF(shadow, client);

		if (change.length === 0) return;

		yield this.surreal.modify(type.modelName, snapshot.id, change).then(diff => {

			// Filter out any sent diff values
			diff = diff.filter(d => {
				return !change.map(v => v.path).includes(d.path);
			});

			// Patch the client value
			let client = this.serialize();
			let server = PATCH(client, diff);

			// Store the updated value
			store.push( store.normalize(type.modelName, server) );

			// Cache the updated value
			this._cache = this.serialize();

		});

	}).restartable(),

});
