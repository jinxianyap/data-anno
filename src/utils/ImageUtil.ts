

export class ImageUtil {
    public static loadImage(elemID: string, imageFile: File) {
        let location = document.getElementById(elemID);
        let image = new Image();
        image.classList.add("pairDisplayImage");
        image.src = URL.createObjectURL(imageFile);
        location!.appendChild(image);
    }

    public static cropImage(image: File, position: any): File {
        const canvas = document.createElement("canvas");
        const img = new Image();
        img.src = URL.createObjectURL(image);
        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;
        canvas.width = position.width;
        canvas.height = position.height;
        const ctx = canvas.getContext("2d");
        
        ctx!.drawImage(
            img,
            position.x * scaleX,
            position.y * scaleY,
            position.width * scaleX,
            position.height * scaleY,
            0,
            0,
            position.width,
            position.height
         )
    
         const reader = new FileReader()
         canvas.toBlob((blob: any) => {
             reader.readAsDataURL(blob)
             reader.onloadend = () => {
                 console.log(reader.result);
                 return reader.result;
             }
         })

         return new File([], '');
    }
}