import Mixin from '@ember/object/mixin';
import { observer } from '@ember/object';
import { debounce } from '@ember/runloop';

const CHECKS = [
	'isSaving',
	'isDeleted',
	'isReloading',
];

export default Mixin.create({

	findsave: observer(...CHECKS, 'dirtyType', function() {
		debounce(this, this.autosave, 100);
	}).on('init'),

	autosave() {

		for (let c in CHECKS) {
			if ( this.get(c) === true ) return;
		}

		if ( this.get('dirtyType') ) this.save();

	},

});
