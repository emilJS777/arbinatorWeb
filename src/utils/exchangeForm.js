export function exchangePayload(form, editing = false) {
  const payload = {title: form.title, icon_path: form.icon_path, index: form.index, enabled: form.enabled};
  for (const key of ['api_key', 'api_secret', 'password']) {
    if (!editing || form[key]) payload[key] = form[key] || '';
  }
  return payload;
}
