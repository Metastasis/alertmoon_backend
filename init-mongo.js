db.createUser({
  user: 'test',
  pwd: 'root',
  roles: [
    {
      role: 'readWrite',
      db: 'sms-reader'
    }
  ]
});
