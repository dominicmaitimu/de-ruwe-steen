package com.deruwesteen.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "DeRuweSteenFiles")
public class DeRuweSteenFilesPlugin extends Plugin {
    private static final int MAX_FILE_BYTES = 20 * 1024 * 1024;
    private static final String BACKUP_MIME = "application/vnd.deruwesteen.backup";

    @PluginMethod
    public void pickBackup(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/*");
        startActivityForResult(call, intent, "handleBackupPicked");
    }

    @PluginMethod
    public void saveFile(PluginCall call) {
        String fileName = call.getString("fileName");
        String content = call.getString("content");
        if (fileName == null || !fileName.matches("[A-Za-z0-9._-]{1,120}") || content == null
            || content.length() > ((MAX_FILE_BYTES + 2L) / 3L) * 4L) {
            call.reject("Ongeldige bestandsgegevens.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(fileName.endsWith(".json") ? "application/json" : BACKUP_MIME);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        startActivityForResult(call, intent, "handleFileSaved");
    }

    @ActivityCallback
    protected void handleBackupPicked(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }
        Uri uri = result.getData().getData();
        try (InputStream input = getContext().getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) throw new IllegalStateException("Het bestand kon niet worden geopend.");
            byte[] buffer = new byte[8192];
            int total = 0;
            int read;
            while ((read = input.read(buffer)) != -1) {
                total += read;
                if (total > MAX_FILE_BYTES) throw new IllegalStateException("Het bestand is groter dan 20 MB.");
                output.write(buffer, 0, read);
            }
            JSObject response = new JSObject();
            response.put("cancelled", false);
            response.put("fileName", "backup.deruwesteen");
            response.put("content", Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP));
            call.resolve(response);
        } catch (Exception exception) {
            call.reject("Het gekozen bestand kon niet veilig worden gelezen.", exception);
        }
    }

    @ActivityCallback
    protected void handleFileSaved(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }
        String content = call.getString("content");
        try {
            byte[] bytes = Base64.decode(content, Base64.DEFAULT);
            if (bytes.length > MAX_FILE_BYTES) throw new IllegalStateException("Het bestand is groter dan 20 MB.");
            Uri uri = result.getData().getData();
            try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (output == null) throw new IllegalStateException("Het bestand kon niet worden opgeslagen.");
                output.write(bytes);
                output.flush();
            }
            JSObject response = new JSObject();
            response.put("cancelled", false);
            call.resolve(response);
        } catch (Exception exception) {
            call.reject("Het bestand kon niet veilig worden opgeslagen.", exception);
        }
    }
}
