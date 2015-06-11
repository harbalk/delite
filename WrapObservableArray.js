define([
	"dcl/dcl",
	"decor/Evented",
	"requirejs-dplugins/Promise!"
], function (dcl, Evented, Promise) {

	return dcl(Evented, {

		/**
		 * Array that contains the items to display.
		 * @member {Array}
		 * @default null
		 */
		data: null,

		/**
		 * The store that have created this WrapObservable object.
		 * @member {delite/Store}
		 * @default null
		 */
		store: null,

		/**
		 * Set the identity of an object
		 */
		_setIdentity: function (item, id) {
			item.id = id;
		},

		/**
		 * Retrieves an object in the data by its identity
		 */
		get: function (id) {
			var res = this.data[0];
			var	i = 1;
			while (res.id !== id) {
				res = this.data[i];
				i++;
			}
			return Promise.resolve(res);
		},

		/**
		 * Returns the identity of an item.
		 * @param {Object} item The item
		 * @returns {Object}
		 * @protected
		 */
		getIdentity: function (item) {
			return item.id !== undefined ? item.id : this.data.indexOf(item);
		},

		/**
		 * Called to perform the fetch operation on the collection.
		 * @protected
		 */
		fetch: function () {
			return Promise.resolve(this.data);
		},

		/**
		 * Called to perform the fetchRange operation on the collection.
		 * @param {args} - contains the start index and the end index of the fetch
		 * @protected
		 */
		fetchRange: function (args) {
			var res = this.data.slice(args.start, args.end);
			if (res.length < (args.end - args.start)) {
				//var promise = new Promise(function (resolve) {
				//	var evt = {start: args.start, end: args.end, resol: resolve}
				//	this.store.emit("new-query-asked", evt);
				//}.bind(this));
				//return promise;
				var promise;
				var evt = {start: args.start, end: args.end, setPromise: function (pro) {
					promise = pro;
				}};
				this.store.emit("new-query-asked", evt);
				return promise;
			} else {
				return Promise.resolve(res);
			}
		}
	});
});
