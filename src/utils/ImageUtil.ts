

export class ImageUtil {
    public static loadImage(elemID: string, imageFile: File) {
        let location = document.getElementById(elemID);
        let image = new Image();
        image.classList.add("pairDisplayImage");
        image.src = URL.createObjectURL(imageFile);
        location!.appendChild(image);
    }
}