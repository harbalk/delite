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
/*====
	 _getCollection: function (processQueryResult) {
		 // summary:
		 //		Filter the store and return the result
		 // processQueryResult: Function
		 //		Function apply on the dstore.
		 // returns: {dstore}
	 _untrack: function () {
		 // summary:
		 //		Function to remove the trackability of the dstore
	 _setIdentity: function (item, id) {
		 // summary:
		 //		Function used to set the id of an item - (used in delite/StoreMap)
		 // item: Object - the item to set id
		 // id: value of the id to set
	 get: function (id) {
		 // summary:
		 //		Retrieves an object in the data by its identity (used occasionally by StoreMap)
		 // id: the id of the object to get
	 getIdentity: function (item) {
		 // summary:
		 //		Get the identity of an object
		 // item: Object - the item to get the identity
	 }
====*/
});
