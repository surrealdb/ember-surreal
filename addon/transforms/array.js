import DS from 'ember-data';
import { A, isArray } from '@ember/array';

export default DS.Transform.extend({
	deserialize(value) {
		return isArray(value) ? A(value) : A();
	},
	serialize(value) {
		return isArray(value) ? A(value) : A();
	},
});
