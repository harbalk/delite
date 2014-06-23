define(function () {
	/* jshint multistr: true */
	/* jshint -W015 */
	/* jshint -W033 */
	return "\
.d-readonly *,\
.d-disabled *,\
.d-readonly,\
.d-disabled {\
  cursor: default;\
}\
.d-reset {\
  margin: 0;\
  border: 0;\
  padding: 0;\
  font: inherit;\
  line-height: normal;\
  color: inherit;\
}\
.d-inline {\
  display: inline-block;\
  border: 0;\
  padding: 0;\
  vertical-align: middle;\
}\
.d-hidden,\
[d-hidden=true],\
[d-shown]:not([d-shown=true]) {\
  display: none;\
}\
.d-invisible,\
[d-invisible=true],\
[d-visible]:not([d-visible=true]) {\
  visibility: hidden;\
}\
html,\
body {\
  width: 100%;\
  margin: 0;\
  padding: 0;\
}\
body {\
  overflow-x: hidden;\
  -webkit-text-size-adjust: none;\
  font-family: Helvetica;\
  font-size: 17px;\
  background-color: #c5ccd3;\
}\
.d-popup {\
  position: absolute;\
  background-color: transparent;\
  margin: 0;\
  border: 0;\
  padding: 0;\
  -webkit-overflow-scrolling: touch;\
  -webkit-box-shadow: 0 1px 5px rgba(0, 0, 0, 0.25);\
  -moz-box-shadow: 0 1px 5px rgba(0, 0, 0, 0.25);\
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.25);\
}\
.d-tooltip-dialog-popup {\
  -webkit-box-shadow: none;\
  -moz-box-shadow: none;\
  box-shadow: none;\
}";
});
