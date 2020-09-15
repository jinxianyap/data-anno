import { Position } from "../store/image/types";
import options from '../options.json';
import { IDProcess } from "./enums";

export class GeneralUtil {
    public static loadImage(elemID: string, imageFile: File, imageID: string): HTMLImageElement {
        if (imageFile === undefined) return new Image();
        let location = document.getElementById(elemID);
        let image = new Image();
        image.classList.add("pairDisplayImage");
        image.setAttribute("id", imageID);
        image.src = URL.createObjectURL(imageFile);
        location!.appendChild(image);
        return image;
    }

    public static getSource(imageFile: File): string {
        return URL.createObjectURL(imageFile);
    }

    public static toggleOverlay(show: boolean): void {
        if (show) {
            document.getElementById('overlay')!.classList.add('show');
        } else {
            document.getElementById('overlay')!.classList.remove('show');
        }
    }

    public static arePositionsEqual(first?: Position, second?: Position): boolean {
        if (first === undefined && second === undefined) return true;
        if (first === undefined || second === undefined) return false;
        return first.x1 === second.x1
            && first.x2 === second.x2
            && first.x3 === second.x3
            && first.x4 === second.x4
            && first.y1 === second.y1
            && first.y2 === second.y2
            && first.y3 === second.y3
            && first.y4 === second.y4;
    }

    public static getInitialIDProcess(docType: string): IDProcess {
        if (options.documentTypes.double.includes(docType)) {
            return IDProcess.DOUBLE_FRONT;
        } else {
            return IDProcess.SINGLE;
        }
    }
}