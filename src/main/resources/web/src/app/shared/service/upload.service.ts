import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpRequest, HttpEventType, HttpResponse } from '@angular/common/http';
import { Subject, Observable } from 'rxjs';
import { AlertService } from 'src/app/shared/service/alert.service';
import { Alert } from 'src/app/shared/model/Alert';
import { AuthenticationService } from 'src/app/shared/service/authentication.service';

const url = '/api/v1/fileuploaddownloader/uploadFile';

@Injectable()
export class UploadService {
  constructor(private http: HttpClient,
    private alertService: AlertService, private authenticationService: AuthenticationService) { }

  public upload(files: Set<File>): { [key: string]: Observable<number> } {
    // this will be the our resulting map
    const status = {};

    files.forEach(file => {
      // create a new multipart-form for every file
      const formData: FormData = new FormData();
      formData.append('file', file, file.name);

      let params = new HttpParams();
      var userID = this.authenticationService.getLoggedInUser().id;
      params = params.append('userID', userID);

      var updatedUrl = url+'?userId='+userID;
      // create a http-post request and pass the form
      // tell it to report the upload progress
      const req = new HttpRequest('POST', updatedUrl, formData, {
        reportProgress: true
      });

      // create a new progress-subject for every file
      const progress = new Subject<number>();


      // send the http-request and subscribe for progress-updates
      this.http.request(req).subscribe(event => {
        if (event.type === HttpEventType.UploadProgress) {

          // calculate the progress percentage
          const percentDone = Math.round(100 * event.loaded / event.total);

          // pass the percentage into the progress-stream
          progress.next(percentDone);
        } else if (event instanceof HttpResponse) {

          console.log("Adding success event");
          this.alertService.addAlert(new Alert('success', this.alertService.getNextID(), "Document uploaded successfully"));
          // Close the progress-stream if we get an answer form the API
          // The upload is complete
          progress.complete();
        }
      });

      // Save every progress-observable in a map of all observables
      status[file.name] = {
        progress: progress.asObservable()
      };
    });
    // return the map of progress.observables
    return status;
  }
}
