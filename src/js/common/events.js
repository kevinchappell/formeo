
// Default options
let defaults = {
  formeoLoaded: (evt) => {},
  onAdd: () => {},
  onUpdate: evt => console.log(evt),
  onSave: (evt) => {},
  confirmClearAll: (evt) => {
    if (window.confirm(evt.confirmationMessage)) {
      evt.clearAllAction();
    }
  }
};

/**
 * Events class is used to register events and throttle their callbacks
 */
const events = {
  init: function(options) {
    this.opts = Object.assign({}, defaults, options);
    return this;
  }
};

document.addEventListener('formeoUpdated', function(evt) {
  let {timeStamp, type, data} = evt;
  let evtData = {
    timeStamp,
    type,
    data
  };
  events.opts.onUpdate(evtData);
});

document.addEventListener('confirmClearAll', function(evt) {
  evt = {
    timeStamp: evt.timeStamp,
    type: evt.type,
    rows: evt.detail.rows,
    rowCount: evt.detail.rows.length,
    confirmationMessage: evt.detail.confirmationMessage,
    clearAllAction: evt.detail.clearAllAction,
    btnCoords: evt.detail.btnCoords
  };

  events.opts.confirmClearAll(evt);
});

document.addEventListener('formeoSaved', function(evt) {
  evt = {
    timeStamp: evt.timeStamp,
    type: evt.type,
    formData: evt.detail.formData
  };
  events.opts.onSave(evt);
});

document.addEventListener('formeoLoaded', function(evt) {
  events.opts.formeoLoaded(evt.detail.formeo);
  // window.controlNav = evt.detail.formeo.controls.controlNav;
});

export default events;
