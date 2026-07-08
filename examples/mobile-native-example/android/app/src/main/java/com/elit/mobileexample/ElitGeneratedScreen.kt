package com.elit.mobileexample

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

@Composable
fun ElitGeneratedScreen() {
    val uriHandler = LocalUriHandler.current

    var toggleValue0 by remember { mutableStateOf(true) }

    Column(modifier = Modifier.padding(24.dp)) {
        Text(text = "Elit Native Mobile Example")
        Text(text = "This screen is generated from the same Elit syntax during elit mobile sync.")
        Checkbox(
            checked = toggleValue0,
            onCheckedChange = { toggleValue0 = it },
            modifier = Modifier
        )
        TextButton(onClick = { uriHandler.openUri("https://github.com/elitjs/elit") }, modifier = Modifier) {
            Text(text = "Open project page")
        }
        Button(onClick = { /* TODO: wire elit event(s): press */ }, modifier = Modifier) {
            Text(text = "Native placeholder button")
        }
    }
}
