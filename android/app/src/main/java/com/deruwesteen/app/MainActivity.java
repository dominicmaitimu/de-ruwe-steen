package com.deruwesteen.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(DeRuweSteenFilesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
