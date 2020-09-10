

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
}