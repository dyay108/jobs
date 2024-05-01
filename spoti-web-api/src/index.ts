import express, { Express } from 'express';
import bodyParser from 'body-parser';
import router from './routes/route';
import cors from "cors";

const app: Express = express();
const port: number = 3100;

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(express.json())

app.use(cors());

app.use('/api/v1', router)


app.listen(port, "0.0.0.0", () => {
  console.log(`Spotify auth listening on port ${port}`);
});