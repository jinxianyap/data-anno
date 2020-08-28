

export class ImageUtil {
    public static loadImage(elemID: string, imageFile: File, imageID: string): HTMLImageElement {
        let location = document.getElementById(elemID);
        let image = new Image();
        image.classList.add("pairDisplayImage");
        image.setAttribute("id", imageID);
        image.src = URL.createObjectURL(imageFile);
        location!.appendChild(image);
        return image;
    }
}