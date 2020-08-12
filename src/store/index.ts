import { combineReducers } from "redux";
import { generalReducer } from "./general/reducer";
import { imageReducer } from "./image/reducer";

export const rootReducer = combineReducers({
    general: generalReducer,
    image: imageReducer,
})

export type AppState = ReturnType<typeof rootReducer>;