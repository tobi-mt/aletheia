package com.aletheia.app;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeBiometricLock")
public class NativeBiometricLockPlugin extends Plugin {
    private static final String PREFERENCES_NAME = "aletheia_biometric_lock";
    private static final String ENABLED_KEY = "enabled";
    private static final int AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_WEAK;

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
    }

    private boolean isAvailable() {
        return BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS) == BiometricManager.BIOMETRIC_SUCCESS;
    }

    private JSObject state() {
        boolean available = isAvailable();
        JSObject result = new JSObject();
        result.put("available", available);
        result.put("enabled", available && preferences().getBoolean(ENABLED_KEY, false));
        result.put("biometryType", "biometric");
        return result;
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(state());
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        if (!enabled) {
            preferences().edit().putBoolean(ENABLED_KEY, false).apply();
            call.resolve(state());
            return;
        }
        authenticate(call, () -> {
            preferences().edit().putBoolean(ENABLED_KEY, true).apply();
            call.resolve(state());
        });
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        authenticate(call, () -> call.resolve());
    }

    private void authenticate(PluginCall call, Runnable onSuccess) {
        if (!isAvailable()) {
            call.reject("Biometric authentication is unavailable on this device.");
            return;
        }
        if (!(getActivity() instanceof FragmentActivity)) {
            call.reject("Biometric authentication cannot be presented right now.");
            return;
        }

        String reason = call.getString("reason", "Confirm it is you to continue.");
        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
            .setTitle("Aletheia")
            .setSubtitle(reason)
            .setAllowedAuthenticators(AUTHENTICATORS)
            .setNegativeButtonText("Cancel")
            .build();
        BiometricPrompt prompt = new BiometricPrompt(
            (FragmentActivity) getActivity(),
            ContextCompat.getMainExecutor(getContext()),
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                    super.onAuthenticationSucceeded(result);
                    onSuccess.run();
                }

                @Override
                public void onAuthenticationError(int errorCode, @NonNull CharSequence errorMessage) {
                    super.onAuthenticationError(errorCode, errorMessage);
                    call.reject(errorMessage.toString());
                }
            }
        );
        prompt.authenticate(promptInfo);
    }
}
