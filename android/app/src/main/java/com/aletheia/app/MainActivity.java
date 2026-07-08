package com.aletheia.app;

import android.os.Bundle;
import android.view.Window;
import com.getcapacitor.BridgeActivity;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {
    private static final int STARTUP_SYSTEM_BAR_COLOR = 0xFFEEF2EF;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(ManagedAudioPlugin.class);
        super.onCreate(savedInstanceState);
        applyStartupSystemBarStyle();
    }

    @Override
    protected void onResume() {
        super.onResume();
        applyStartupSystemBarStyle();
    }

    private void applyStartupSystemBarStyle() {
        Window window = getWindow();
        if (window == null) {
            return;
        }

        window.setStatusBarColor(STARTUP_SYSTEM_BAR_COLOR);
        window.setNavigationBarColor(STARTUP_SYSTEM_BAR_COLOR);

        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);
    }
}
