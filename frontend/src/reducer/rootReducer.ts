import { combineReducers } from "@reduxjs/toolkit";
import authSlice from "../slice/authSlice";
import userSlice from "../slice/userSlice";
import callingSlice from "../slice/callingSlice";

const rootReducer = combineReducers({
  auth: authSlice,
  user: userSlice,
  calling: callingSlice,
});

export default rootReducer;
