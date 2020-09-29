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

    public static isOptionalLandmark(codeName: string, documentType?: string, processStage?: IDProcess): boolean {
        if (documentType === undefined || processStage === undefined) return true;
        let idx = options.landmark.keys.findIndex((each) => each === documentType + processStage);
        if (idx === -1) return true;
        return options.landmark.optional.codeNames[idx].includes(codeName);
    }

    public static beautifyWord(word: string): string {
        if (word === undefined) return '';
        let separates = word.replace(/([A-Z])/g,' $1');
        return separates.charAt(0).toUpperCase()+separates.slice(1);
    }

    public static processOCRValue(value: string): {newlines: number[], terms: string[]} {
        let filtered = value.split(' ').filter((each: string) => each.length > 0).join(' ');

        let lines = filtered.split('\n').filter((each: string) => each.length > 0);
        let newlines = [];
        let pos = 0;

        if (lines.length > 1) {
            for (var i = 0; i < lines.length; i++) {
                let words = lines[i].split(' ').filter((each: string) => each.length > 0);
                lines[i] = words.join(' ');
                if (i < lines.length - 1) {
                    pos += words.length;
                    newlines.push(pos);
                }
            }
        }
        
        let terms = lines.join(' ').split(' ');

        return {
            newlines: newlines,
            terms: terms
        }
    }
}