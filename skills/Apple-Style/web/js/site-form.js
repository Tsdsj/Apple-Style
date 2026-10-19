/* Website form enhancement (pattern 2.10, website-patterns.md). No dependencies; load with defer.
   Without this script the form submits as a plain form and the browser's own validation runs.
   With it: novalidate is set, a wrong field gets aria-invalid and its .as-form-error text is shown,
   an error summary with links to the fields takes focus, and a form with data-ajax shows an in-page
   success or failure message in .as-site-form-status (role="status"). The script never sends data itself:
   the form's action must accept a POST and answer with a 2xx status for data-ajax forms. */
(function () {
  'use strict';
  var INVALID = 'aria-invalid';

  function errorOf(control) {
    var field = control.closest('.as-form-field');
    return field ? field.querySelector('.as-form-error') : null;
  }

  // Shows or hides the field's error and sets aria-invalid. Returns true when the field is wrong.
  function check(control) {
    var error = errorOf(control), bad = control.willValidate && !control.validity.valid;
    if (error) error.hidden = !bad;
    if (bad) control.setAttribute(INVALID, 'true'); else control.removeAttribute(INVALID);
    return bad;
  }

  // The summary lists each wrong field as a link (href="#id"), then takes focus.
  function showSummary(form, wrong) {
    var box = form.querySelector('.as-site-form-summary');
    if (!box) return;
    var list = box.querySelector('ul');
    list.textContent = '';
    wrong.forEach(function (control) {
      var item = document.createElement('li'), link = document.createElement('a'), error = errorOf(control);
      link.href = '#' + control.id;
      link.textContent = error ? error.textContent : control.validationMessage;
      item.appendChild(link);
      list.appendChild(item);
    });
    box.hidden = false;
    box.focus();
  }

  // The status region is outside the form (in .as-site-form-wrap) so it adds no space while empty.
  function say(form, text, state) {
    var status = form.parentNode.querySelector('.as-site-form-status');
    if (!status) return;
    status.textContent = text || '';
    if (state) status.setAttribute('data-state', state); else status.removeAttribute('data-state');
    status.focus();
  }

  function onSubmit(event) {
    var form = event.currentTarget, wrong = [], summary = form.querySelector('.as-site-form-summary');
    Array.prototype.forEach.call(form.elements, function (control) {
      if (check(control)) wrong.push(control);
    });
    if (wrong.length) { event.preventDefault(); showSummary(form, wrong); return; }
    if (summary) { summary.hidden = true; summary.querySelector('ul').textContent = ''; }

    // Honeypot: a filled trap field means a bot. Send nothing and show the success text.
    var trap = form.querySelector('.as-site-form-trap input');
    if (trap && trap.value) { event.preventDefault(); form.reset(); say(form, form.getAttribute('data-success'), 'success'); return; }
    if (!form.hasAttribute('data-ajax')) return;   // plain submit: the server answers

    event.preventDefault();
    var button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        say(form, form.getAttribute('data-success'), 'success');
      })
      .catch(function () { say(form, form.getAttribute('data-failure'), 'error'); })
      .then(function () { if (button) button.disabled = false; });
  }

  // A field that is wrong is re-checked when the user leaves it, so the message clears as soon as it is fixed.
  // Untouched empty fields do not show an error until submit.
  function onFocusOut(event) {
    var control = event.target;
    if (control.getAttribute && (control.getAttribute(INVALID) === 'true' || control.value)) check(control);
  }

  Array.prototype.forEach.call(document.querySelectorAll('form[data-site-form]'), function (form) {
    form.noValidate = true;
    form.addEventListener('submit', onSubmit);
    form.addEventListener('focusout', onFocusOut);
  });
})();
