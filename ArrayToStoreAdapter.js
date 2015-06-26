define([
	"dcl/dcl",
	"decor/Evented",
	"decor/ObservableArray",
	"decor/Observable",
	"requirejs-dplugins/Promise!"
], function (dcl, Evented, ObservableArray, Observable, Promise) {

	return dcl(Evented, {
		constructor: dcl.after(function (args) {
			if (args.length) {
				this.mix(args[0]);
			}
			// affect the callbacks of the observe functions
			this._itemHandles = [];
			this._observeCallbackArray = this.__observeCallbackArray.bind(this);
			this._observeCallbackItems = this.__observeCallbackItems.bind(this);
			for (var i = 0; i < this.source.length; i++) {
				// affect the callback to the observe function if the item is observable
				this._itemHandles[i] = Observable.observe(this.source[i], this._observeCallbackItems);
			}
			// affect the callback to the observe function if the array is observable
			this._arrayHandle = ObservableArray.observe(this.source, this._observeCallbackArray);
		}),

		mix: function (hash) {
			for (var x in hash) {
				if (hash.hasOwnProperty(x)) {
					this[x] = hash[x];
				}
			}
		},

		/**
		 * The array that contains the items to display.
		 * @member {Array}
		 * @default null
		 */
		data: null,

		/**
		 * The array that the adapter represents (with all the items)
		 * @member {Array}
		 * @default null
		 */
        source: null,

		/**
		 * A query filter to apply to the store.
		 * @member {Object}
		 * @default {}
		 */
		query: {},


        /////////////////////////////////////////////////////////////////
        // Functions dedicated to the Observability of the source
        /////////////////////////////////////////////////////////////////

		/**
		 * Called to get the collection used by the delite/Store
		 * @param processQueryResult
		 * @returns {*} - ArrayToStoreAdapter
		 */
		_getCollection: function (processQueryResult) {
			this.data = processQueryResult.call(this, this.source.filter(this._isQueried, this));
			var res = this;
			if (this._arrayHandle || this._itemHandles) {
				res.obs = true;
			}
			return res;
		},

		/**
		 * Function to add an item in the data and pass the good event to the function itemAdded of delite/Store
		 * @param evt
		 * @returns {{index: *, target: (*|evtUpdated.obj|evtRemoved.obj|evtAdded.obj|host.obj|obj)}}
		 * @private
		 */
		_addItemToCollection: function (evt) {
			var i = evt.index - 1;
			while (!this._isQueried(this.source[i])) {
				i--;
			}
			var idx = this.data.indexOf(this.source[i]);
			this.data.splice(idx + 1, 0, evt.obj);
			return {index: idx + 1, target: evt.obj};
		},

		/**
		 * Function to remove an item from the data and pass the good event to the function itemRemoved of delite/Store
		 * @param evt
		 * @returns {{previousIndex: (*|number|Number)}}
		 * @private
		 */
		_removeItemFromCollection: function (evt) {
			var idx = this.data.indexOf(evt.obj);
			this.data.splice(idx, 1);
			return {previousIndex: idx};
		},

		/**
		 * Function to test if the update was finally a remove or an add to the data
		 * @param evt
		 * @param idx
		 * @returns {*|boolean}
		 * @private
		 */
		_isAnUpdate: function (evt, idx) {
			return (this._isQueried(evt.obj) && idx >= 0);
		},

		/**
		 * Function that emit an event "add" if the update was finally an "add" and an event "remove" if it was a remove
		 * @param evt
		 * @param idx
		 * @private
		 */
		_redirectEvt: function (evt, idx) {
			if (this._isQueried(evt.obj) && idx < 0) {
                var evtAdded = this._addItemToCollection(evt);
				this.emit("add", evtAdded);
			} else if (!this._isQueried(evt.obj) && idx >= 0) {
                var evtRemoved = this._removeItemFromCollection(evt);
				this.emit("delete", evtRemoved);
			}
		},

		/**
		 * Function to pass the good event to the function itemUpdated of delite/Store
		 * @param evt
		 * @param idx
		 * @returns {{index: *, previousIndex: *, target: (*|evtUpdated.obj|evtRemoved.obj|evtAdded.obj|host.obj|obj)}}
		 * @private
		 */
		_updateItemInCollection: function (evt, idx) {
			return {index: idx, previousIndex: idx, target: evt.obj};
		},

		/**
		 * Called when a modification is done on the array.
		 * @param changeRecords - send by the Observe function
		 */
		__observeCallbackArray: function (changeRecords) {
			if (!this._beingDiscarded) {
				for (var i = 0; i < changeRecords.length; i++) {
					if (changeRecords[i].type === "splice") {
						var j, evt;
						for (j = 0; j < changeRecords[i].removed.length; j++) {
							this._itemHandles[changeRecords[i].index].remove();
							this._itemHandles.splice(changeRecords[i].index, 1);
							var evtRemoved = {previousIndex: changeRecords[i].index,
								obj: changeRecords[i].removed[j]};
							if (this._isQueried(evtRemoved.obj)) {
								evt = this._removeItemFromCollection(evtRemoved);
								this.emit("delete", evt);
							}
						}
						for (j = 0; j < changeRecords[i].addedCount; j++) {
							var evtAdded = {
								index: changeRecords[i].index + j,
								obj: this.source[changeRecords[i].index + j]
							};
							if (this.renderItems !== null && this.renderItems !== undefined) {
								evtAdded.index = evtAdded.index <= this.renderItems.length ?
									evtAdded.index : this.renderItems.length;
							}
							// affect the callback to the observe function if the item is observable
							this._itemHandles.splice(changeRecords[i].index + j, 0,
								Observable.observe(
									this.source[changeRecords[i].index + j], this._observeCallbackItems)
							);
							if (this._isQueried(evtAdded.obj)) {
								evt = this._addItemToCollection(evtAdded);
								this.emit("add", evt);
							}
						}
					}
				}
			}
		},

		/**
		 * Called when a modification is done on the items.
		 * @param changeRecords - send by the Observe function
		 */
		__observeCallbackItems: function (changeRecords) {
			if (!this._beingDiscarded) {
				var objects = [];
				for (var i = 0; i < changeRecords.length; i++) {
					var object = changeRecords[i].object;
					if (objects.indexOf(object) < 0) {
						objects.push(object);
						if (changeRecords[i].type === "add" || changeRecords[i].type === "update" ||
							changeRecords[i].type === "delete" || changeRecords[i].type === "splice") {
							var evtUpdated = {
								index: this.source.indexOf(object),
								previousIndex: this.source.indexOf(object),
								obj: object,
								oldValue: changeRecords[i].oldValue,
								name: changeRecords[i].name
							};
                            var idx = this.data.indexOf(evtUpdated.obj);
                            if (!this._isAnUpdate(evtUpdated, idx)) {
                                this._redirectEvt(evtUpdated, idx);
                            } else {
                                var evt = this._updateItemInCollection(evtUpdated, idx);
                                this.emit("update", evt);
                            }
						}
					}
				}
			}
		},

		/**
		 * Called to verify if the item respect the query conditions
		 * @param item
		 * @private
		 */
		_isQueried: function (item, index, tab, query) {
			var realQuery = query ? query : this.query;
            if (Object.getOwnPropertyNames(realQuery).length !== 0) {
                if (typeof(realQuery) === "function") {
                    return realQuery(item);
                }
                if (!(realQuery.type)) {
                    var normalizedQuery = {};
                    normalizedQuery.type = "eq";
                    normalizedQuery.args = [];
                    for (var property in realQuery) {
                        normalizedQuery.args[0] = property;
                        normalizedQuery.args[1] = realQuery[property];
                    }
                    realQuery = normalizedQuery;
                }
                var prop = realQuery.args[0];
                var res = this._testItemProperty(prop, item, index, tab, realQuery);
                if (res === true && realQuery.type !== "or") {
                    return false;
                } else if (res === true && realQuery.type === "or") {
                    return true;
                }
                if (realQuery.type === "or") {
                    return false;
                }
                return true;
            } else {
                return true;
            }
		},

        /**
         * Used to reduce _isQueried complexity
         * @param prop
         * @param i
         * @param item
         * @param index
         * @param tab
         * @param queries
         * @returns {boolean}
         * @private
         */
        /* jshint maxcomplexity: 14*/
        _testItemProperty: function (prop, item, index, tab, query) {
            var res, res1, res2;
            switch (query.type) {
            case "eq":
                res = (item[prop] !== query.args[1]);
                break;
            case "ne":
                res = (item[prop] === query.args[1]);
                break;
            case "lt":
                res = (item[prop] >= query.args[1]);
                break;
            case "lte":
                res = (item[prop] > query.args[1]);
                break;
            case "gt":
                res = (item[prop] <= query.args[1]);
                break;
            case "gte":
                res = (item[prop] < query.args[1]);
                break;
            case "in":
                res = ((query.args[1].indexOf(item[prop]) === -1));
                break;
            case "match":
                res = (!(query.args[1].test(item[prop])));
                break;
            case "contains":
                res = this._arrayContains(item[prop], query.args[1]);
                break;
            case "and":
                res1 = (!(this._isQueried(item, index, tab, query.args[0])));
                res2 = (!(this._isQueried(item, index, tab, query.args[1])));
                res = res1 || res2;
                break;
            case "or":
                res1 = (this._isQueried(item, index, tab, query.args[0]));
                res2 = (this._isQueried(item, index, tab, query.args[1]));
                res = res1 || res2;
                break;
            default:
                throw new Error("Unknown filter operation '" + query.type + "'");
            }
            return res;
        },
        /* jshint maxcomplexity: 10*/

        /**
         * Function to test if an array contains all the values in parameter values
         * @param array
         * @param values
         * @returns {*}
         * @private
         */
        _arrayContains: function (array, values) {
            for (var j = 0; j < values.length; j++) {
                var res = res ? res : (array.indexOf(values[j]) === -1);
            }
            return res;
        },

		/**
		 * Synchronously deliver change records to all listeners registered via `observe()`.
		 */
		deliver:  function () {
			if (this._arrayHandle) {
				this._arrayHandle.deliver();
			}
			if (this._itemHandles.length !== 0) {
				this._observeCallbackItems && Observable.deliverChangeRecords(this._observeCallbackItems);
			}
		},

		/**
		 * Discard change records for all listeners registered via `observe()`.
		 */
		discardChanges: function () {
			if (this._arrayHandle && this._itemHandles) {
				this._beingDiscarded = true;
				this._arrayHandle.deliver();
				this._observeCallbackItems && Observable.deliverChangeRecords(this._observeCallbackItems);
				this._beingDiscarded = false;
				return this;
			}
		},

		/**
		 * Function to remove the observability on the array and its items
		 * @private
		 */
		_untrack: function () {
			if (this._arrayHandle) {
				this._arrayHandle.remove();
			}
			if (this._itemHandles) {
				for (var i = 0; i < this._itemHandles.length; i++) {
					this._itemHandles[i].remove();
				}
			}
		},


        /////////////////////////////////////////////////////////////////////////
        // Functions dedicated to reproduce the behaviour of dstore functions
        /////////////////////////////////////////////////////////////////////////

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
                var promise;
                var evt = {start: args.start, end: args.end, resLength: res.length, setPromise: function (pro) {
                    promise = pro;
                }};
                this.emit("_new-query-asked", evt);
                return promise;
            } else {
                return Promise.resolve(res);
            }
        },

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
		}
	});

/*====
    _getCollection: function (processQueryResult) {
        // summary:
        //		Filter the array in store with the query to set the data and return the ArrayToStoreAdapter
        //		in collection variable of delite/Store
        // processQueryResult: Function
		//		Function apply on the array or its objects (sort for example).
		// returns: ArrayToStoreAdapter
	},
	_addItemToCollection: function (evt) {
        // summary:
		//		Function to add an item in the data and pass the good event to the function itemAdded of delite/Store
		// evt: Object
		//		The event send by the observe callbacks to transmit to the function itemAdded of delite/Store
		// returns: evt
	},
	_removeItemFromCollection: function (evt) {
		 // summary:
		 //		Function to remove an item from the data and pass the good event to the function itemRemoved
		 //     of delite/Store
		 // evt: Object
		 //		The event send by the observe callbacks to transmit to the function itemRemoved of delite/Store
		 // returns: evt
	 },
	_isAnUpdate: function (evt, idx) {
		// summary:
		//		Function to test if the update was finally a remove or an add to the data
		//		return true if it is an update.
		// evt:
		//		The event send by the observe callbacks
		// idx:
		//		The index of the item in the data. (= -1 if the item is not in the data)
		// returns:
		//		Boolean
	},
	_redirectEvt: function (evt, idx) {
		// summary:
		//		Function that emit an event "add" if the update was finally an "add" and an event "remove"
		//		if it was a remove
		// evt:
		//		The event send by the observe callbacks
		// idx:
		//		The index of the item in the data. (= -1 if the item is not in the data)
	},
	_updateItemInCollection: function (evt) {
		// summary:
		//		Function to update an item in the data and pass the good event to the function itemUpdated
		//		of delite/Store
		// evt: Object
		//		The event send by the observe callbacks to transmit to the function itemUpdated of delite/Store
		// returns: evt
	},
	__observeCallbackArray: function (changeRecords) {
        // summary:
        //		Function called when a modification is done on the array.
        //		Read trough the changeRecords to send the appropriate events to the delite/Store ("remove" or "add").
        // changeRecords: Object
        //		The changeRecords registered by the array (based on splice type) - see decor/ObservableArray
    __observeCallbackItems: function (changeRecords) {
        // summary:
        //		Function called when a modification is done on an item of the array.
        //		Read trough the changeRecords and send the appropriate events to the delite/Store ("update").
        // changeRecords: Object
        //		The changeRecords registered by the item ("add", "delete" or "update" type) - see decor/Observable
	_isQueried: function (item) {
        // summary:
        //		Called to verify if the item respect the query conditions, using this.query.
        // item: Object
        //		The item to test
        // return: Boolean
    fetch: function () {
        // summary:
        //		Called to perform the fetch operation on the adapter.
        // return: Promise - containing all the data queried (= this.data)
    fetchRange: function (args) {
        // summary:
        //		Called to perform the fetchRange operation on the adapter.
        //		Asks for more data if the number of data collect is inferior to what is expected (send the event
        //		"_new-query-asked" to the delite/Store).
        // args: Object : {start, end)
        //		Contains the start and end indexes of the fetchRnage operation
        // return: Promise - containing the data queried between index start and index
    deliver:  function () {
        // summary:
        //		Synchronously deliver change records to all listeners registered via `observe()`.
    discardChanges: function () {
        // summary:
        //		Discard change records for all listeners registered via `observe()`.
	_untrack: function () {
        // summary:
        //		Function to remove the observability on the array and its items
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
        //		Get the identity of an object (that means the id of the object or his index in the data)
        // item: the item to get the identity
====*/
});
