/* Contact form for the static site (no backend). Validation follows the Apple-Style website
   form pattern: each wrong field gets aria-invalid and its error text; an error summary with
   links to the fields takes focus on an invalid submit. A valid submit does NOT send anything:
   it shows the success message in the status region and clears the form. To send for real,
   point the form at an endpoint and use web/js/site-form.js with data-ajax instead of this file. */
(function () {
  'use strict';
  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = document.getElementById('contact-status');
  var summary = form.querySelector('.as-site-form-summary');
  var list = summary.querySelector('ul');
  var INVALID = 'aria-invalid';

  function errorOf(control) {
    var field = control.closest('.as-form-field');
    return field ? field.querySelector('.as-form-error') : null;
  }

  // Shows or hides the field's error and sets aria-invalid. Returns true when the field is wrong.
  function check(control) {
    var error = errorOf(control);
    var bad = control.willValidate && !control.validity.valid;
    if (error) error.hidden = !bad;
    if (bad) control.setAttribute(INVALID, 'true'); else control.removeAttribute(INVALID);
    return bad;
  }

  function fields() {
    return Array.prototype.filter.call(form.querySelectorAll('.as-input'), function (c) {
      return !c.closest('.as-site-form-trap');
    });
  }

  // A field that is wrong is re-checked when the user leaves it, so the message clears once fixed.
  // Untouched empty fields show no error until submit.
  form.addEventListener('focusout', function (event) {
    var control = event.target;
    if (control.getAttribute && (control.getAttribute(INVALID) === 'true' || control.value)) check(control);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var wrong = fields().filter(function (c) { return check(c); });

    if (wrong.length) {
      list.textContent = '';
      wrong.forEach(function (control) {
        var item = document.createElement('li');
        var link = document.createElement('a');
        link.href = '#' + control.id;
        link.textContent = errorOf(control).textContent;
        item.appendChild(link);
        list.appendChild(item);
      });
      summary.hidden = false;
      status.textContent = '';
      status.removeAttribute('data-state');
      summary.focus();
      return;
    }

    summary.hidden = true;
    list.textContent = '';
    // A filled honeypot is a bot. It gets the same answer, and nothing is sent in any case.
    form.reset();
    status.textContent = form.getAttribute('data-success');
    status.setAttribute('data-state', 'success');
    status.focus();
  });
})();
