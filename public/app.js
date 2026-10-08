var order = null;
var custId = 1;

function money(c) {
  return '€' + (c / 100).toFixed(2);
}

function reload() {
  custId = document.getElementById('cust').value;
  var oid = document.getElementById('oid').value;
  fetch('/orders/' + oid, { headers: { 'X-Customer-Id': custId } }).then(function (r) {
    if (r.status != 200) {
      r.json().then(function (j) {
        document.getElementById('msg').innerHTML = '<p class="err">' + (j.error || 'error ' + r.status) + '</p>';
        document.getElementById('app').innerHTML = '';
      });
      return;
    }
    r.json().then(function (j) {
      order = j;
      document.getElementById('msg').innerHTML = '';
      render();
    });
  });
}

function render() {
  var html = '';
  html += '<div class="box"><b>Order ' + order.id + '</b> (' + order.status + ')';
  html += '<table>';
  for (var i = 0; i < order.items.length; i++) {
    var it = order.items[i];
    html += '<tr><td>' + it.sku + '</td><td>' + it.qty + '</td><td class="r">' + money(it.unitPrice * it.qty) + '</td>';
    if (order.status == 'open') {
      html += '<td><button onclick="removeIt(\'' + it.sku + '\')">x</button></td>';
    } else {
      html += '<td></td>';
    }
    html += '</tr>';
  }
  html += '</table>';
  if (order.items.length == 0) html += '<i>no items</i>';
  html += '</div>';

  if (order.status == 'open') {
    html += '<div class="box">Add: <select id="sku"><option>MUG</option><option>TEE</option><option>CAP</option><option>HOODIE</option><option>SOCKS</option></select> ';
    html += '<input id="qty" value="1" size="3"> <button onclick="addIt()">add</button></div>';
  }

  html += '<div class="box"><table>';
  html += '<tr><td>Subtotal</td><td class="r">' + money(order.subtotal) + '</td></tr>';
  if (order.bulkDiscount > 0) html += '<tr><td>Bulk discount</td><td class="r">-' + money(order.bulkDiscount) + '</td></tr>';
  html += '<tr><td>Shipping</td><td class="r">' + money(order.shipping) + '</td></tr>';
  html += '<tr><td><b>Total</b></td><td class="r"><b>' + money(order.total) + '</b></td></tr>';
  html += '</table></div>';

  document.getElementById('app').innerHTML = html;
}

function removeIt(sku) {
  fetch('/orders/' + order.id + '/items/' + sku, { method: 'DELETE', headers: { 'X-Customer-Id': custId } }).then(function (r) {
    if (r.status != 200) {
      r.json().then(function (j) { document.getElementById('msg').innerHTML = '<p class="err">' + (j.error || 'error') + '</p>'; });
    } else {
      document.getElementById('msg').innerHTML = '<p class="ok">removed ' + sku + '</p>';
    }
    // reload order
    fetch('/orders/' + order.id, { headers: { 'X-Customer-Id': custId } }).then(function (r2) { return r2.json(); }).then(function (j) { order = j; render(); });
  });
}

function addIt() {
  var sku = document.getElementById('sku').value;
  var qty = parseInt(document.getElementById('qty').value);
  fetch('/orders/' + order.id + '/items', { method: 'POST', headers: { 'X-Customer-Id': custId, 'Content-Type': 'application/json' }, body: JSON.stringify({ sku: sku, qty: qty }) }).then(function (r) {
    if (r.status != 200) {
      r.json().then(function (j) { document.getElementById('msg').innerHTML = '<p class="err">' + (j.error || j.message || 'error') + '</p>'; });
    } else {
      document.getElementById('msg').innerHTML = '<p class="ok">added</p>';
    }
    fetch('/orders/' + order.id, { headers: { 'X-Customer-Id': custId } }).then(function (r2) { return r2.json(); }).then(function (j) { order = j; render(); });
  });
}

reload();
