import { combineReducers } from "redux";
import { generalReducer } from "./general/reducer";
import { imageReducer } from "./image/reducer";
import { IDReducer } from "./id/reducer";

export const rootReducer = combineReducers({
    general: generalReducer,
    id: IDReducer,
    image: imageReducer,
})

export type AppState = ReturnType<typeof rootReducer>;