define([
	"dcl/dcl"
], function (dcl) {

	return dcl(null, {
		constructor: dcl.after(function (args) {
			if (args.length) {
				this.mix(args[0]);
			}
		}),

		mix: function (hash) {
			for (var x in hash) {
				if (hash.hasOwnProperty(x)) {
					this[x] = hash[x];
				}
			}
		},

		/**
		 * The dstore that the adapter represents
		 * @member {dstore/Store}
		 * @default null
		 */
		source: null,

		/**
		 * A query filter to apply to the store.
		 * @member {Object}
		 * @default {}
		 */
		query: {},

		_getCollection: function (processQueryResult) {
			return processQueryResult.call(this, this.source.filter(this.query));
		},

		/**
		 * Function to remove the trackability of the dstore
		 * @private
		 */
		_untrack: function () {
			if (this._tracked) {
				this._tracked.tracking.remove();
				this._tracked = null;
			}
		},

		/**
		 * Set the identity of an object
		 */
		_setIdentity: function (item, id) {
			this.source._setIdentity(item, id);
		},

		/**
		 * Retrieves an object in the data by its identity
		 */
		get: function (id) {
			return this.source.get(id);
		},

		/**
		 * Returns the identity of an item.
		 * @param {Object} item The item
		 * @returns {Object}
		 * @protected
		 */
		getIdentity: function (item) {
			return this.source.getIdentity(item);
		}
	});
});
