define([
	"intern!object",
	"intern/chai!assert", "dcl/dcl", "dojo/_base/declare",
	"delite/register", "delite/Widget", "delite/Store", "decor/ObservableArray"
], function (registerSuite, assert, dcl, declare, register, Widget, Store, ObservableArray) {
	var C = register("test-store-arrayobs", [HTMLElement, Widget, Store]);
	registerSuite({
		name: "Store-ArrayObs",
		/*
		 // commented out until https://github.com/ibm-js/delite/issues/93 fixed
		 "Error" : function () {
		 var d = this.async(2000);
		 var store = new C();
		 var callbackCalled = false;
		 store.on("query-error", function () {
		 // should fire before the timeout
		 d.resolve();
		 });
		 store.attachedCallback();
		 store.store = new Rest({ target: "/" });
		 return d;
		 },
		 */

		Updates: function () {
			var d = this.async(1500);
			var refreshRenderingCallCount = 0;
			var store = new C();
			store.refreshRendering = function () {
				refreshRenderingCallCount++;
			};
			var myData = [
				{ id: "foo", name: "Foo" },
				{ id: "bar", name: "Bar" }
			];
			store.on("query-success", d.callback(function () {
				assert(store.renderItems instanceof Array);
				assert.strictEqual(store.renderItems.length, 2);
				assert.deepEqual(store.renderItems[0], myData[0]);
				assert.deepEqual(store.renderItems[1], myData[1]);
				assert.strictEqual(refreshRenderingCallCount, 1, "before store.set");
				store.store.set(0, { id: "foo", name: "Foo2" });
				store.deliver();
				assert.strictEqual(store.renderItems.length, 2);
				assert.deepEqual(store.renderItems[0], { id: "foo", name: "Foo2" });
				assert.deepEqual(store.renderItems[1], { id: "bar", name: "Bar" });
				assert.strictEqual(refreshRenderingCallCount, 2, "after store.set");
				store.store.push({ id: "fb", name: "FB" });
				store.deliver();
				assert.strictEqual(store.renderItems.length, 3);
				assert.deepEqual(store.renderItems[0], { id: "foo", name: "Foo2" });
				assert.deepEqual(store.renderItems[1], { id: "bar", name: "Bar" });
				assert.deepEqual(store.renderItems[2], { id: "fb", name: "FB" });
				assert.strictEqual(refreshRenderingCallCount, 3, "after store.add");
				store.store.splice(1, 1);
				store.deliver();
				assert.strictEqual(store.renderItems.length, 2);
				assert.deepEqual(store.renderItems[0], { id: "foo", name: "Foo2" });
				assert.deepEqual(store.renderItems[1], { id: "fb", name: "FB" });
				assert.strictEqual(refreshRenderingCallCount, 4, "after store.remove");
			}));
			store.store = new ObservableArray({ id: "foo", name: "Foo" },
				{ id: "bar", name: "Bar" });
			return d;
		},

		NullStore: function () {
			var d = this.async(1500);
			var store = new C({
				store: new ObservableArray({ id: "foo", name: "Foo" },
					{ id: "bar", name: "Bar" })
			});
			setTimeout(d.rejectOnError(function () {
				store.on("query-success", d.callback(function () {
					assert.strictEqual(store.renderItems.length, 0);
				}));

				// Test the change store to null triggers a so-called query
				store.store = null;
			}), 100);
			return d;
		},

		Destroy: function () {
			var d = this.async(1500);
			var store = new C();
			var myData = [
				{ id: "foo", name: "Foo" },
				{ id: "bar", name: "Bar" }
			];
			store.on("query-success", d.callback(function () {
				assert(store.renderItems instanceof Array);
				assert.strictEqual(store.renderItems.length, 2);
				assert.deepEqual(store.renderItems[0], myData[0]);
				assert.deepEqual(store.renderItems[1], myData[1]);
				// we destroy the store, we should not get any notification after that
				store.destroy();
				store.store.push({ id: "foo", name: "Foo2" });
				store.deliver();
				assert.strictEqual(store.renderItems.length, 2);
				assert.deepEqual(store.renderItems[0], { id: "foo", name: "Foo" });
				assert.deepEqual(store.renderItems[1], { id: "bar", name: "Bar" });
				store.store.push({ id: "fb", name: "FB" });
				store.deliver();
				assert.strictEqual(store.renderItems.length, 2);
				assert.deepEqual(store.renderItems[0], { id: "foo", name: "Foo" });
				assert.deepEqual(store.renderItems[1], { id: "bar", name: "Bar" });
				store.store.splice(1, 1);
				store.deliver();
				assert.strictEqual(store.renderItems.length, 2);
				assert.deepEqual(store.renderItems[0], { id: "foo", name: "Foo" });
				assert.deepEqual(store.renderItems[1], { id: "bar", name: "Bar" });
			}));
			store.store = new ObservableArray({ id: "foo", name: "Foo" },
				{ id: "bar", name: "Bar" });
			return d;
		},

		Query: function () {
			var d = this.async(1500);
			var store = new C();
			store.query = { id: "foo" };
			var myData = [
				{ id: "foo", name: "Foo" },
				{ id: "bar", name: "Bar" }
			];
			store.on("query-success", d.callback(function () {
				assert(store.renderItems instanceof Array);
				assert.strictEqual(store.renderItems.length, 1);
				assert.deepEqual(store.renderItems[0], myData[0]);
				store.store.push({ id: "foo", name: "Foo2" });
				store.deliver();
				// this works because put is synchronous & same for add etc...
				assert.strictEqual(store.renderItems.length, 2);
				assert.deepEqual(store.renderItems[0], { id: "foo", name: "Foo" });
				assert.deepEqual(store.renderItems[1], { id: "foo", name: "Foo2" });
				store.store.push({ id: "fb", name: "FB" });
				store.deliver();
				assert.strictEqual(store.renderItems.length, 2);
				assert.deepEqual(store.renderItems[0], { id: "foo", name: "Foo" });
				assert.deepEqual(store.renderItems[1], { id: "foo", name: "Foo2" });
			}));
			store.store = new ObservableArray({ id: "foo", name: "Foo" },
				{ id: "bar", name: "Bar" });
			return d;
		},

		StoreFuncRange: function () {
			var d = this.async(1500);
			var store = new C();
			store.fetch = function (collection) {
				return store.fetchRange(collection, {start: 0, end: 1});
			};
			store.on("query-success", d.callback(function () {
				assert(store.renderItems instanceof Array);
				assert.strictEqual(store.renderItems.length, 1);
			}));
			store.store = new ObservableArray({ id: "foo", name: "Foo" },
				{ id: "bar", name: "Bar" });
			return d;
		},

		StoreFuncSort: function () {
			var d = this.async(1500);
			var store = new C();
			store.processQueryResult = function (store) {
				return store.sort(function (a, b) {
					if (a.index > b.index) {
						return 1;
					}
					if (a.index < b.index) {
						return -1;
					}
					return 0;
				});
			};
			var myData = [
				{ id: "foo", name: "Foo", index: 1 },
				{ id: "bar", name: "Bar", index: 0 }
			];
			store.on("query-success", d.callback(function () {
				assert(store.renderItems instanceof Array);
				assert.strictEqual(store.renderItems.length, 2);
				assert.deepEqual(store.renderItems[0], myData[1]);
				assert.deepEqual(store.renderItems[1], myData[0]);
				//var item = store.store[0];
				//item.index = 2;
				//store.store.push(item);
				//store.deliver();
				//// this works because put is synchronous
				//assert.deepEqual(store.renderItems[0], { id: "bar", name: "Bar", index: 1 });
				//assert.deepEqual(store.renderItems[1], { id: "foo", name: "Foo", index: 2 });
				//item = store.store[1];
				//item.index = 0;
				//store.store.push(item);
				//store.deliver();
				//assert.deepEqual(store.renderItems[0], { id: "foo", name: "Foo", index: 0 });
				//assert.deepEqual(store.renderItems[1], { id: "bar", name: "Bar", index: 1 });
			}));
			// use empty model to easy comparison
			store.store = new ObservableArray({ id: "foo", name: "Foo", index: 1 },
				{ id: "bar", name: "Bar", index: 0 });
			return d;
		},

		// TODO: re-enable when dstore will have re-introduced refresh event?

		SetNewStore: function () {
			var d = this.async(1500);
			var store = new C();
			var myData = [
				{ id: "foo", name: "Foo" },
				{ id: "bar", name: "Bar" }
			];
			var init = true;
			store.on("query-success", d.rejectOnError(function () {
				assert(store.renderItems instanceof Array);
				if (init) {
					init = false;
					assert.strictEqual(store.renderItems.length, 2);
					assert.deepEqual(store.renderItems[0], myData[0]);
					assert.deepEqual(store.renderItems[1], myData[1]);
					// this will issue the query again
					store.store = new ObservableArray({ id: "another", name: "Another" });
				} else {
					assert.strictEqual(store.renderItems.length, 1);
					assert.deepEqual(store.renderItems[0], { id: "another", name: "Another" });
					d.resolve();
				}
			}));
			store.attachedCallback();
			// use empty model to easy comparison
			store.store = new ObservableArray({ id: "foo", name: "Foo" },
				 { id: "bar", name: "Bar" });
			return d;
		},

		"Deliver, DiscardChanges": function () {
			var d = this.async(2000);
			var store = new C();
			var myData = [
				{id: "foo", name: "Foo"},
				{id: "bar", name: "Bar"}
			];
			store.on("query-success", d.callback(function () {
				assert(store.renderItems instanceof Array);
				assert.strictEqual(store.renderItems.length, 2);
				assert.deepEqual(store.renderItems[0], myData[0]);
				assert.deepEqual(store.renderItems[1], myData[1]);
				store.store.set(0, { id: "foo", name: "Foo2" });
				store.deliver();
				assert.strictEqual(store.renderItems.length, 2);
				assert.deepEqual(store.renderItems[0], { id: "foo", name: "Foo2" });
				assert.deepEqual(store.renderItems[1], { id: "bar", name: "Bar" });
				store.store.push({ id: "fb", name: "FB" });
				store.discardChanges();
				assert.strictEqual(store.renderItems.length, 2);
				assert.deepEqual(store.renderItems[0], { id: "foo", name: "Foo2" });
				assert.deepEqual(store.renderItems[1], { id: "bar", name: "Bar" });
			}));
			store.store = new ObservableArray({id: "foo", name: "Foo"},
				{id: "bar", name: "Bar"});
			return d;
		},

		teardown: function () {
			//container.parentNode.removeChild(container);
		}
	});
});

