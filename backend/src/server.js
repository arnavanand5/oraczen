const app = require('./app');
const { port } = require('./config');

app.listen(port, () => {
  console.log(`Deal Desk API running on http://localhost:${port}`);
});
