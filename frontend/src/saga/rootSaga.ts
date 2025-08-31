import { all } from "redux-saga/effects";
import { authSaga } from "./sagaAuth";
import { callingSaga } from "./callingSaga";

export default function* rootSaga() {
  yield all([authSaga(), callingSaga()]);
}
