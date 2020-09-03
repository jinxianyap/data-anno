import { IDState } from '../store/id/types';
import { Rotation } from './enums';
import dummy from '../assets/dummy.png';

export class DatabaseUtil {

    public static initializeID(session: any, date: string, index: number): IDState {
        let id = session.sessionID;
        return {
            originalID: {
                image: this.dataURLtoFile(session.mykad_front_ori, id + "_mykad_front_ori.jpg"),
                croppedImage: this.dataURLtoFile(session.mykad_front_ocr, id + "_mykad_front_ocr.jpg"),
                landmark: [],
                ocr: [],
            },
            backID: {
                image: this.dataURLtoFile(session.mykad_back_ori, id + "_mykad_back_ori.jpg"),
                croppedImage: this.dataURLtoFile(session.mykad_front_ocr, id + "mykad_back_ocr.jpg"),
                landmark: [],
                ocr: [],
            },
            croppedFace: this.dataURLtoFile(session.mykad_face, id + "_mykad_face.jpg"),
            selfieImage: this.dataURLtoFile(session.face, id + "_face.jpg"),
            selfieVideo: this.dataURLtoFile(session.face_video, id + "_face_video.mp4"),
            videoStills: session.face_video_stills !== undefined ? session.face_video_stills.map((each: any, idx: number) => 
                this.dataURLtoFile(each, id + "_face_" + (idx + 1) + ".jpg")
            ) : undefined,
            jsonData: undefined,
            dataLoaded: false,
            processed: false,
            index: index,
            dateCreated: new Date(parseInt(date.slice(0, 4)), parseInt(date.slice(4, 6)), parseInt(date.slice(6, 8))),
            sessionID: id,
            originalIDProcessed: false,
            backIDsProcessed: 0,
            originalIDRotation: Rotation.ROT0,
            croppedIDRotation: Rotation.ROT0,
            backIDRotation: Rotation.ROT0,
            internalIDs: [],
            internalIndex: 0
        }
    }

    public static loadSessionData(session: any, ID: IDState): IDState {
        let id = session.sessionID;
        return {
            ...ID,
            dataLoaded: true,
            originalID: {
                image: this.dataURLtoFile(session.mykad_front_ori, id + "_mykad_front_ori.jpg"),
                croppedImage: this.dataURLtoFile(session.mykad_front_ocr, id + "_mykad_front_ocr.jpg"),
                landmark: [],
                ocr: [],
            },
            backID: {
                image: this.dataURLtoFile(session.mykad_back_ori, id + "_mykad_back_ori.jpg"),
                croppedImage: this.dataURLtoFile(session.mykad_back_ocr, id + "mykad_back_ocr.jpg"),
                landmark: [],
                ocr: [],
            },
            croppedFace: this.dataURLtoFile(session.mykad_face, id + "_mykad_face.jpg"),
            selfieImage: this.dataURLtoFile(session.face, id + "_face.jpg"),
            selfieVideo: this.dataURLtoFile(session.face_video, id + "_face_video.mp4"),
            videoStills: session.face_video_stills !== undefined ? session.face_video_stills.map((each: any, idx: number) => 
                this.dataURLtoFile(each, id + "_face_" + (idx + 1) + ".jpg")
            ) : undefined,
        }
    }

    public static dataURLtoFile(dataurl: string, filename: string): File {
        if (!dataurl) return new File([dummy], 'dummy.png');
        let arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)![1],
            bstr = atob(arr[1]), 
            n = bstr.length, 
            u8arr = new Uint8Array(n);

        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, {type:mime});
    }

    public static dateToString(date: Date) {
        let month = '';
        if (date.getMonth() < 10) {
            month = '0' + date.getMonth();
        } else {
            month += date.getMonth();
        }
        let day = '';
        if (date.getDate() < 10) {
            day = '0' + date.getDate();
        } else {
            day += date.getDate();
        }
        return date.getFullYear() + month + day;
    }

    public static beautifyWord(word: string): string {
        let separates = word.replace(/([A-Z])/g,' $1');
        return separates.charAt(0).toUpperCase()+separates.slice(1);
    }

}