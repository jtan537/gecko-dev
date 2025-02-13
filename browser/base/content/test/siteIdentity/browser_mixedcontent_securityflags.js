/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// The test loads a web page with mixed active and mixed display content and
// makes sure that the mixed content flags on the docshell are set correctly.
// * Using default about:config prefs (mixed active blocked, mixed display
//   loaded) we load the page and check the flags.
// * We change the about:config prefs (mixed active blocked, mixed display
//   blocked), reload the page, and check the flags again.
// * We override protection so all mixed content can load and check the
//   flags again.

const TEST_URI =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "test-mixedcontent-securityerrors.html";
const PREF_DISPLAY = "security.mixed_content.block_display_content";
const PREF_DISPLAY_UPGRADE = "security.mixed_content.upgrade_display_content";
const PREF_ACTIVE = "security.mixed_content.block_active_content";
var gTestBrowser = null;

registerCleanupFunction(function() {
  // Set preferences back to their original values
  Services.prefs.clearUserPref(PREF_DISPLAY);
  Services.prefs.clearUserPref(PREF_DISPLAY_UPGRADE);
  Services.prefs.clearUserPref(PREF_ACTIVE);
  gBrowser.removeCurrentTab();
});

add_task(async function blockMixedActiveContentTest() {
  // Turn on mixed active blocking and mixed display loading and load the page.
  Services.prefs.setBoolPref(PREF_DISPLAY, false);
  Services.prefs.setBoolPref(PREF_DISPLAY_UPGRADE, false);
  Services.prefs.setBoolPref(PREF_ACTIVE, true);

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URI);
  gTestBrowser = gBrowser.getBrowserForTab(tab);

  await SpecialPowers.spawn(gTestBrowser, [], function() {
    is(
      docShell.hasMixedDisplayContentBlocked,
      false,
      "hasMixedDisplayContentBlocked flag has been set"
    );
    is(
      docShell.hasMixedActiveContentBlocked,
      true,
      "hasMixedActiveContentBlocked flag has been set"
    );
    is(
      docShell.hasMixedDisplayContentLoaded,
      true,
      "hasMixedDisplayContentLoaded flag has been set"
    );
    is(
      docShell.hasMixedActiveContentLoaded,
      false,
      "hasMixedActiveContentLoaded flag has been set"
    );
  });
  await assertMixedContentBlockingState(gTestBrowser, {
    activeLoaded: false,
    activeBlocked: true,
    passiveLoaded: true,
  });

  // Turn on mixed active and mixed display blocking and reload the page.
  Services.prefs.setBoolPref(PREF_DISPLAY, true);
  Services.prefs.setBoolPref(PREF_ACTIVE, true);

  gBrowser.reload();
  await BrowserTestUtils.browserLoaded(gTestBrowser);

  await SpecialPowers.spawn(gTestBrowser, [], function() {
    is(
      docShell.hasMixedDisplayContentBlocked,
      true,
      "hasMixedDisplayContentBlocked flag has been set"
    );
    is(
      docShell.hasMixedActiveContentBlocked,
      true,
      "hasMixedActiveContentBlocked flag has been set"
    );
    is(
      docShell.hasMixedDisplayContentLoaded,
      false,
      "hasMixedDisplayContentLoaded flag has been set"
    );
    is(
      docShell.hasMixedActiveContentLoaded,
      false,
      "hasMixedActiveContentLoaded flag has been set"
    );
  });
  await assertMixedContentBlockingState(gTestBrowser, {
    activeLoaded: false,
    activeBlocked: true,
    passiveLoaded: false,
  });
});

add_task(async function overrideMCB() {
  // Disable mixed content blocking (reloads page) and retest
  let { gIdentityHandler } = gTestBrowser.ownerGlobal;
  gIdentityHandler.disableMixedContentProtection();
  await BrowserTestUtils.browserLoaded(gTestBrowser);

  await SpecialPowers.spawn(gTestBrowser, [], function() {
    is(
      docShell.hasMixedDisplayContentLoaded,
      true,
      "hasMixedDisplayContentLoaded flag has not been set"
    );
    is(
      docShell.hasMixedActiveContentLoaded,
      true,
      "hasMixedActiveContentLoaded flag has not been set"
    );
    is(
      docShell.hasMixedDisplayContentBlocked,
      false,
      "second hasMixedDisplayContentBlocked flag has been set"
    );
    is(
      docShell.hasMixedActiveContentBlocked,
      false,
      "second hasMixedActiveContentBlocked flag has been set"
    );
  });
  await assertMixedContentBlockingState(gTestBrowser, {
    activeLoaded: true,
    activeBlocked: false,
    passiveLoaded: true,
  });
});
